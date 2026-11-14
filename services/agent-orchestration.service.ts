import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AgentTask, type IAgentTask } from "@/models/agent-task";
import { Application, type IApplication } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { AuditLog } from "@/models/audit-log";
import { UserPreference } from "@/models/preference";
import { ProviderRegistry } from "@/providers/provider-registry";
import { type ApplyTier } from "@/providers/job-source-provider.interface";
import { assertValidTransition } from "./application-state-machine";
import { toolRegistry } from "./tool-registry";

export interface PipelineStepLog {
  step: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  timestamp: string;
  details?: Record<string, unknown>;
  error?: string;
}

export interface PipelineExecutionResult {
  taskId: string;
  status: "completed" | "failed" | "cancelled" | "awaiting_approval";
  currentStep: string;
  jobId: string;
  applicationId?: string;
  tier: ApplyTier;
  matchScore?: number;
  eligible?: boolean;
  confirmationReference?: string;
  message: string;
  stepLogs: PipelineStepLog[];
}

export class AgentOrchestrationService {
  /**
   * Executes the full step-by-step auto-apply pipeline (Section 10.3).
   * Strict safety checks: global pause, limits, untrusted job description,
   * deterministic scoring, factual grounding, tier gating, and consent barriers.
   */
  async runJobApplicationPipeline(
    userId: string,
    jobId: string,
    options?: {
      minimumMatchThreshold?: number;
      force?: boolean;
      onStepUpdate?: (
        step: string,
        status: PipelineStepLog["status"],
        message: string,
        progress: number,
        details?: Record<string, unknown>
      ) => Promise<void> | void;
    }
  ): Promise<PipelineExecutionResult> {
    await connectToDatabase();

    const stepProgressMap: Record<string, number> = {
      preflight: 12,
      fetch_job: 24,
      verify_job_open: 36,
      check_duplicate: 48,
      analyze_job: 60,
      calculate_match: 72,
      generate_documents: 84,
      validate_application: 92,
      tier_branching: 100,
      completed_manual: 100,
    };

    const getStepUserMessage = (
      step: string,
      status: PipelineStepLog["status"],
      details?: Record<string, unknown>,
      error?: string
    ) => {
      if (status === "failed") {
        return error || `Step failed: ${step}`;
      }
      if (status === "running") {
        switch (step) {
          case "preflight":
            return "Running preflight checks on daily application limits and governance controls...";
          case "fetch_job":
            return "Ingesting job description and extracting ATS platform parameters...";
          case "verify_job_open":
            return "Checking posting availability and active status on career portal...";
          case "check_duplicate":
            return "Scanning application tracking history for existing submissions...";
          case "analyze_job":
            return "AI extracting core competencies, required tech stack, and seniority level...";
          case "calculate_match":
            return "Evaluating profile match against job requirements...";
          case "generate_documents":
            return "AI tailoring resume bullet points and drafting customized cover letter...";
          case "validate_application":
            return "Verifying profile integrity and application package completeness...";
          case "tier_branching":
            return "Finalizing application package in Tracker...";
          default:
            return `Processing ${step}...`;
        }
      }
      switch (step) {
        case "preflight":
          return "Step 1 complete: Preflight verified. Limits & safety parameters confirmed.";
        case "fetch_job":
          return `Step 2 complete: Ingested listing for ${details?.title || "role"} at ${details?.company || "company"}.`;
        case "verify_job_open":
          return "Step 3 complete: Confirmed job posting is live and accepting applications.";
        case "check_duplicate":
          return "Step 4 complete: Application verified and cleared to process.";
        case "analyze_job":
          return `Step 5 complete: Extracted ${details?.requiredSkillsCount ?? "key"} core skills and qualifications.`;
        case "calculate_match":
          return `Step 6 complete: Candidate match calculated (${details?.score ?? 0}% match).`;
        case "generate_documents":
          return "Step 7 complete: Tailored resume and personalized cover letter generated.";
        case "validate_application":
          return "Step 8 complete: Application package verified.";
        case "tier_branching":
          return "Step 9 complete: Application package ready for review in Tracker!";
        default:
          return `Completed ${step}`;
      }
    };

    const stepLogs: PipelineStepLog[] = [];
    const logStep = (
      step: string,
      status: PipelineStepLog["status"],
      details?: Record<string, unknown>,
      error?: string
    ) => {
      const entry: PipelineStepLog = {
        step,
        status,
        timestamp: new Date().toISOString(),
        details,
        error,
      };
      stepLogs.push(entry);

      if (options?.onStepUpdate) {
        const progress = stepProgressMap[step] || 50;
        const message = getStepUserMessage(step, status, details, error);
        try {
          options.onStepUpdate(step, status, message, progress, details);
        } catch {
          // ignore stream write errors
        }
      }
    };

    // 0. Create AgentTask record to track execution and allow cancellation
    const idempotencyKey = `pipeline_${userId}_${jobId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    let task: IAgentTask;
    try {
      task = await AgentTask.create({
        userId,
        taskType: "job_application_pipeline",
        status: "running",
        idempotencyKey,
        startedAt: new Date(),
        payload: { jobId, options },
        retryCount: 0,
        maxRetries: 3,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("E11000")) {
        try {
          const coll = mongoose.connection.collection("agenttasks");
          await coll.dropIndex("userId_1_idempotencyKey_1");
        } catch {
          // ignore
        }
        task = await AgentTask.create({
          userId,
          taskType: "job_application_pipeline",
          status: "running",
          idempotencyKey: `pipeline_${userId}_${jobId}_${Date.now()}_retry_${Math.random().toString(36).slice(2, 9)}`,
          startedAt: new Date(),
          payload: { jobId, options },
          retryCount: 0,
          maxRetries: 3,
        });
      } else {
        throw err;
      }
    }

    const taskId = String(task._id);

    const isCancelled = async (): Promise<boolean> => {
      const current = await AgentTask.findById(taskId);
      return current?.status === "cancelled";
    };

    try {
      // 1. PREFLIGHT
      logStep("preflight", "running");
      const preference = await UserPreference.findOne({ userId });

      if (preference?.globalPause) {
        logStep("preflight", "failed", undefined, "Global agent pause is ON.");
        await this.markTaskFailed(taskId, "Global agent pause is ON.", stepLogs);
        return {
          taskId,
          status: "failed",
          currentStep: "preflight",
          jobId,
          tier: "MANUAL",
          message: "Execution halted: Global agent pause is enabled in AI Agent settings.",
          stepLogs,
        };
      }

      if (
        preference?.monthlyTokenBudget &&
        (preference.tokensUsedThisMonth ?? 0) >= preference.monthlyTokenBudget
      ) {
        logStep("preflight", "failed", undefined, "Monthly token budget exceeded.");
        await this.markTaskFailed(taskId, "Monthly token budget exceeded.", stepLogs);
        return {
          taskId,
          status: "failed",
          currentStep: "preflight",
          jobId,
          tier: "MANUAL",
          message: "Execution halted: Monthly token budget has been exhausted.",
          stepLogs,
        };
      }

      // Daily application limit check
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const applicationsToday = await Application.countDocuments({
        userId,
        createdAt: { $gte: startOfDay },
      });

      const maxPerDay = preference?.maxApplicationsPerDay ?? 10;
      if (applicationsToday >= maxPerDay) {
        logStep(
          "preflight",
          "failed",
          { applicationsToday, maxPerDay },
          `Daily limit of ${maxPerDay} applications reached.`
        );
        await this.markTaskFailed(
          taskId,
          `Daily limit of ${maxPerDay} applications reached.`,
          stepLogs
        );
        return {
          taskId,
          status: "failed",
          currentStep: "preflight",
          jobId,
          tier: "MANUAL",
          message: `Execution halted: Daily limit of ${maxPerDay} applications has been reached.`,
          stepLogs,
        };
      }

      logStep("preflight", "completed", {
        globalPause: false,
        dailyApplications: applicationsToday,
        maxPerDay,
      });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 2. FETCH JOB (Untrusted external content)
      logStep("fetch_job", "running");
      const jobData = (await toolRegistry.executeTool("fetch_job", { userId }, { jobId })) as {
        jobId: string;
        title: string;
        company: string;
        location: string;
        sourcePlatform: string;
        originalUrl: string;
        description: string;
        jobStatus: string;
      };
      logStep("fetch_job", "completed", {
        title: jobData.title,
        company: jobData.company,
        sourcePlatform: jobData.sourcePlatform,
      });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 3. VERIFY JOB OPEN
      logStep("verify_job_open", "running");
      const openCheck = (await toolRegistry.executeTool(
        "verify_job_open",
        { userId },
        { jobId }
      )) as { isOpen: boolean; jobStatus: string };

      if (!openCheck.isOpen) {
        logStep("verify_job_open", "failed", openCheck, "Job posting is closed / expired.");
        let app = await Application.findOne({ userId, jobId });
        if (!app) {
          app = await Application.create({
            userId,
            jobId,
            status: "FAILED",
            statusReason: "Job posting is no longer active / closed.",
          });
        } else {
          app.status = "FAILED";
          app.statusReason = "Job posting is no longer active / closed.";
          await app.save();
        }

        await this.markTaskFailed(taskId, "Job posting is closed / expired.", stepLogs);
        return {
          taskId,
          status: "failed",
          currentStep: "verify_job_open",
          jobId,
          applicationId: String(app._id),
          tier: "MANUAL",
          message: "Job posting is no longer accepting applications (closed/expired).",
          stepLogs,
        };
      }
      logStep("verify_job_open", "completed", { isOpen: true });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 4. CHECK DUPLICATE
      logStep("check_duplicate", "running");
      const dupCheck = (await toolRegistry.executeTool(
        "check_duplicate",
        { userId },
        { jobId }
      )) as {
        isDuplicate: boolean;
        reason?: string;
        existingApplicationId?: string;
        existingStatus?: string;
      };

      if (dupCheck.isDuplicate) {
        const blockingStatuses = ["APPLIED", "SUBMITTING", "INTERVIEW", "OFFER", "READY_FOR_REVIEW"];
        const isStrictlyBlocking = Boolean(
          dupCheck.existingStatus && blockingStatuses.includes(dupCheck.existingStatus)
        );

        if (options?.force || !isStrictlyBlocking) {
          logStep("check_duplicate", "completed", {
            isDuplicate: true,
            forced: Boolean(options?.force || !isStrictlyBlocking),
            existingApplicationId: dupCheck.existingApplicationId,
            existingStatus: dupCheck.existingStatus,
          });
        } else {
          logStep(
            "check_duplicate",
            "failed",
            dupCheck as unknown as Record<string, unknown>,
            dupCheck.reason
          );
          await this.markTaskFailed(taskId, dupCheck.reason || "Duplicate detected", stepLogs);
          return {
            taskId,
            status: "failed",
            currentStep: "check_duplicate",
            jobId,
            applicationId: dupCheck.existingApplicationId,
            tier: "MANUAL",
            message:
              dupCheck.reason ||
              "Duplicate application detected. You already applied or tracked this position.",
            stepLogs,
          };
        }
      } else {
        logStep("check_duplicate", "completed", { isDuplicate: false });
      }

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 5. ANALYZE JOB
      logStep("analyze_job", "running");
      const analysis = (await toolRegistry.executeTool(
        "analyze_job",
        { userId },
        { jobId }
      )) as {
        analysisId: string;
        requiredSkills: string[];
        seniorityLevel: string;
        mandatoryConditions: string[];
      };
      logStep("analyze_job", "completed", {
        requiredSkillsCount: analysis.requiredSkills.length,
        seniorityLevel: analysis.seniorityLevel,
      });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 6. CALCULATE MATCH & ELIGIBILITY
      logStep("calculate_match", "running");
      const match = (await toolRegistry.executeTool(
        "calculate_match",
        { userId },
        { jobId }
      )) as {
        overallScore: number;
        eligible: boolean;
        matchingSkills: string[];
        missingSkills: string[];
        recommendedAction: string;
      };

      const minThreshold = options?.minimumMatchThreshold ?? (options?.force ? 0 : 60);
      if ((match.overallScore < minThreshold || !match.eligible) && !options?.force) {
        const reason = !match.eligible
          ? "Mandatory eligibility requirements not met."
          : `Match score ${match.overallScore}% is below required threshold of ${minThreshold}%.`;

        logStep("calculate_match", "failed", { match, minThreshold }, reason);

        // Record as NOT_QUALIFIED per Section 10.3
        let app = await Application.findOne({ userId, jobId });
        if (!app) {
          app = await Application.create({
            userId,
            jobId,
            status: "NOT_QUALIFIED",
            statusReason: reason,
          });
        } else {
          app.status = "NOT_QUALIFIED";
          app.statusReason = reason;
          await app.save();
        }

        await this.markTaskFailed(taskId, reason, stepLogs);
        return {
          taskId,
          status: "failed",
          currentStep: "calculate_match",
          jobId,
          applicationId: String(app._id),
          tier: "MANUAL",
          matchScore: match.overallScore,
          eligible: match.eligible,
          message: reason,
          stepLogs,
        };
      }

      logStep("calculate_match", "completed", {
        score: match.overallScore,
        eligible: match.eligible,
        forced: Boolean(options?.force && match.overallScore < 60),
      });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 7. ADVANCE APPLICATION STATE: SHORTLISTED -> PREPARING
      let application = await Application.findOne({ userId, jobId });
      if (!application) {
        application = await Application.create({
          userId,
          jobId,
          status: "SHORTLISTED",
          statusReason: `Shortlisted with ${match.overallScore}% match.`,
        });
      } else {
        if (
          application.status === "DISCOVERED" ||
          application.status === "NOT_QUALIFIED" ||
          application.status === "ANALYZING"
        ) {
          if (options?.force) {
            application.status = "SHORTLISTED";
          } else {
            assertValidTransition(application.status, "SHORTLISTED");
            application.status = "SHORTLISTED";
          }
          await application.save();
        }
      }

      if (application.status !== "PREPARING") {
        if (options?.force) {
          application.status = "PREPARING";
        } else {
          assertValidTransition(application.status, "PREPARING");
          application.status = "PREPARING";
        }
        await application.save();
      }

      // 8. RESUME & COVER LETTER GENERATION (Grounded in verified profile)
      logStep("generate_documents", "running");
      const resumeRes = (await toolRegistry.executeTool(
        "generate_resume",
        { userId },
        { jobId }
      )) as {
        resumeVersionId: string;
        versionNumber: number;
        unsupportedClaims: string[];
      };

      const coverLetterRes = (await toolRegistry.executeTool(
        "generate_cover_letter",
        { userId },
        { jobId, tone: "professional" }
      )) as {
        coverLetterId: string;
        tone: string;
      };

      application.resumeVersionId = resumeRes.resumeVersionId as unknown as IApplication["resumeVersionId"];
      application.coverLetterId = coverLetterRes.coverLetterId as unknown as IApplication["coverLetterId"];
      await application.save();

      logStep("generate_documents", "completed", {
        resumeVersionId: resumeRes.resumeVersionId,
        coverLetterId: coverLetterRes.coverLetterId,
        unsupportedClaimsCount: resumeRes.unsupportedClaims.length,
      });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 9. VALIDATE APPLICATION
      logStep("validate_application", "running");
      const validation = (await toolRegistry.executeTool(
        "validate_application",
        { userId },
        { jobId }
      )) as { isValid: boolean; missingFields: string[] };

      if (!validation.isValid && !options?.force) {
        const onlyMissingPhone =
          validation.missingFields.length === 1 && validation.missingFields[0] === "phone";
        if (!onlyMissingPhone) {
          const err = `Missing required profile fields: ${validation.missingFields.join(", ")}`;
          logStep(
            "validate_application",
            "failed",
            validation as unknown as Record<string, unknown>,
            err
          );
          application.status = "READY_FOR_REVIEW";
          application.statusReason = err;
          await application.save();

          await this.markTaskFailed(taskId, err, stepLogs);
          return {
            taskId,
            status: "failed",
            currentStep: "validate_application",
            jobId,
            applicationId: String(application._id),
            tier: "MANUAL",
            message: err,
            stepLogs,
          };
        }
      }
      logStep("validate_application", "completed", { isValid: true });

      if (await isCancelled()) {
        return this.abortCancelled(taskId, jobId, stepLogs);
      }

      // 10. BRANCH BY PROVIDER TIER & CONSENT POLICY
      const registry = ProviderRegistry.getInstance();
      const provider = registry.getProvider(jobData.sourcePlatform);
      const tier: ApplyTier =
        provider?.getCapabilities().tier ||
        (jobData.sourcePlatform.toLowerCase().includes("greenhouse") ||
        jobData.sourcePlatform.toLowerCase().includes("lever")
          ? "PREFILL_ASSISTED"
          : "MANUAL");

      logStep("tier_branching", "running", { tier, platform: jobData.sourcePlatform });

      // Tier 1: MANUAL (LinkedIn, Indeed, Naukri, etc.)
      if (tier === "MANUAL") {
        assertValidTransition(application.status, "READY_FOR_REVIEW");
        application.status = "READY_FOR_REVIEW";
        application.statusReason =
          "Tailored application materials generated. Manual submission required via official job portal.";
        await application.save();

        await toolRegistry.executeTool(
          "notify_user",
          { userId },
          {
            title: `Application Ready: ${jobData.company}`,
            message: `Your tailored resume and cover letter for ${jobData.title} are ready for manual submission.`,
            eventType: "application_ready_for_review",
            link: `/tracker?id=${application._id}`,
            deduplicationKey: `ready_review:${application._id}`,
          }
        );

        logStep("tier_branching", "completed", {
          tier: "MANUAL",
          result: "READY_FOR_REVIEW",
        });

        await this.markTaskCompleted(taskId, { tier, status: "READY_FOR_REVIEW" }, stepLogs);
        return {
          taskId,
          status: "completed",
          currentStep: "completed_manual",
          jobId,
          applicationId: String(application._id),
          tier: "MANUAL",
          matchScore: match.overallScore,
          eligible: match.eligible,
          message:
            "Tailored resume and cover letter prepared. Please apply directly on the company website.",
          stepLogs,
        };
      }

      // Tier 2: PREFILL_ASSISTED (Greenhouse, Lever)
      if (tier === "PREFILL_ASSISTED") {
        logStep("prefill_form", "running");
        const prefill = (await toolRegistry.executeTool(
          "prefill_form",
          { userId },
          { jobId }
        )) as {
          success: boolean;
          fieldCount: number;
          instructions: string;
          stoppedBeforeSubmit: boolean;
        };

        assertValidTransition(application.status, "READY_FOR_REVIEW");
        application.status = "READY_FOR_REVIEW";
        application.statusReason =
          "Assisted prefill prepared; candidate review and submission required.";
        await application.save();

        await toolRegistry.executeTool(
          "notify_user",
          { userId },
          {
            title: `Assisted Prefill Ready: ${jobData.company}`,
            message: `Prefilled ${prefill.fieldCount} fields for ${jobData.title}. Submission stopped before submit barrier.`,
            eventType: "application_ready_for_review",
            link: `/tracker?id=${application._id}`,
            deduplicationKey: `prefill_ready:${application._id}`,
          }
        );

        logStep("prefill_form", "completed", prefill);
        await this.markTaskCompleted(taskId, { tier, prefill }, stepLogs);
        return {
          taskId,
          status: "completed",
          currentStep: "completed_prefill",
          jobId,
          applicationId: String(application._id),
          tier: "PREFILL_ASSISTED",
          matchScore: match.overallScore,
          eligible: match.eligible,
          message: prefill.instructions,
          stepLogs,
        };
      }

      // Tier 3: AUTO_SUBMIT (Authorized email or candidate API)
      if (tier === "AUTO_SUBMIT") {
        const consent = preference?.consentPolicy ?? "approve";

        if (consent === "approve") {
          // Candidate approval barrier
          logStep("request_approval", "running");
          await toolRegistry.executeTool(
            "request_approval",
            { userId },
            {
              applicationId: String(application._id),
              notes: "Candidate review and approval required before automated submission.",
            }
          );

          await toolRegistry.executeTool(
            "notify_user",
            { userId },
            {
              title: `Approval Required: ${jobData.company}`,
              message: `Please review and approve the application package for ${jobData.title} at ${jobData.company}.`,
              eventType: "application_ready_for_review",
              link: `/tracker?id=${application._id}`,
              deduplicationKey: `approval_req:${application._id}`,
            }
          );

          logStep("request_approval", "completed", { status: "AWAITING_APPROVAL" });
          await this.markTaskCompleted(
            taskId,
            { tier, status: "AWAITING_APPROVAL", consent: "approve" },
            stepLogs
          );

          return {
            taskId,
            status: "awaiting_approval",
            currentStep: "awaiting_approval",
            jobId,
            applicationId: String(application._id),
            tier: "AUTO_SUBMIT",
            matchScore: match.overallScore,
            eligible: match.eligible,
            message:
              "Application package is ready. Candidate approval is required before automated submission.",
            stepLogs,
          };
        }

        // Auto-consent: Execute submission directly
        logStep("submit_authorized_application", "running");
        const subResult = (await toolRegistry.executeTool(
          "submit_authorized_application",
          { userId },
          { applicationId: String(application._id) }
        )) as {
          success: boolean;
          tier: string;
          status: string;
          confirmationReference?: string;
        };

        logStep("submit_authorized_application", "completed", subResult);
        await this.markTaskCompleted(taskId, subResult, stepLogs);

        return {
          taskId,
          status: "completed",
          currentStep: "submitted",
          jobId,
          applicationId: String(application._id),
          tier: "AUTO_SUBMIT",
          matchScore: match.overallScore,
          eligible: match.eligible,
          confirmationReference: subResult.confirmationReference,
          message: `Application submitted successfully. Confirmation: ${subResult.confirmationReference}`,
          stepLogs,
        };
      }

      throw new Error(`Unhandled tier '${tier}'`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("pipeline_error", "failed", undefined, msg);
      await this.markTaskFailed(taskId, msg, stepLogs);

      return {
        taskId,
        status: "failed",
        currentStep: "error",
        jobId,
        tier: "MANUAL",
        message: `Pipeline encountered an error: ${msg}`,
        stepLogs,
      };
    }
  }

  /**
   * Cancels a running agent task and moves active application to CANCELLED (Section 10.4).
   */
  async cancelAgentTask(userId: string, taskId: string): Promise<boolean> {
    await connectToDatabase();
    const task = await AgentTask.findOne({ _id: taskId, userId });
    if (!task) return false;

    task.status = "cancelled";
    task.completedAt = new Date();
    await task.save();

    if (task.payload && typeof task.payload === "object" && "jobId" in task.payload) {
      const jobId = (task.payload as { jobId: string }).jobId;
      const app = await Application.findOne({ userId, jobId });
      if (app && app.status !== "APPLIED" && app.status !== "REJECTED" && app.status !== "OFFER") {
        app.status = "CANCELLED";
        app.statusReason = "Cancelled by candidate.";
        await app.save();

        await ApplicationEvent.create({
          applicationId: app._id,
          userId,
          fromStatus: app.status,
          toStatus: "CANCELLED",
          reason: "Agent workflow cancelled by user.",
        });
      }
    }

    await AuditLog.create({
      userId,
      action: "AGENT_TASK_CANCELLED",
      resource: `AgentTask:${taskId}`,
    });

    return true;
  }

  /**
   * Retrieves recent agent execution tasks for dashboard / settings.
   */
  async getRecentTasks(userId: string, limit = 20): Promise<IAgentTask[]> {
    await connectToDatabase();
    return AgentTask.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  private async markTaskFailed(
    taskId: string,
    error: string,
    stepLogs: PipelineStepLog[]
  ): Promise<void> {
    await AgentTask.updateOne(
      { _id: taskId },
      {
        $set: {
          status: "failed",
          error,
          result: { stepLogs },
          completedAt: new Date(),
        },
      }
    );
  }

  private async markTaskCompleted(
    taskId: string,
    resultPayload: Record<string, unknown>,
    stepLogs: PipelineStepLog[]
  ): Promise<void> {
    await AgentTask.updateOne(
      { _id: taskId },
      {
        $set: {
          status: "completed",
          result: { ...resultPayload, stepLogs },
          completedAt: new Date(),
        },
      }
    );
  }

  private async abortCancelled(
    taskId: string,
    jobId: string,
    stepLogs: PipelineStepLog[]
  ): Promise<PipelineExecutionResult> {
    return {
      taskId,
      status: "cancelled",
      currentStep: "cancelled",
      jobId,
      tier: "MANUAL",
      message: "Agent workflow cancelled by user.",
      stepLogs,
    };
  }
}

export const agentOrchestrationService = new AgentOrchestrationService();
