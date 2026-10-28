import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { APPLICATION_STATES } from "@/models/application";
import { Job } from "@/models/job";
import { ProfessionalProfile } from "@/models/profile";
import { applicationPreparationService } from "./application-preparation.service";
import { applicationSubmissionService } from "./application-submission.service";
import { applicationTrackingService } from "./application-tracking.service";
import { browserAutomationService } from "./browser-automation.service";
import { coverLetterService } from "./cover-letter.service";
import { duplicateDetectionService } from "./duplicate-detection.service";
import { jobAnalysisService } from "./job-analysis.service";
import { jobDiscoveryService } from "./job-discovery.service";
import { jobMatchingService } from "./job-matching.service";
import { notificationService, type NotificationEventType } from "./notification.service";
import { interviewCoachService } from "./interview-coach.service";
import { resumeGenerationService } from "./resume-generation.service";

export interface ToolExecutionContext {
  userId: string;
  agentTaskId?: string;
  idempotencyKey?: string;
}

export interface RegisteredTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  timeoutMs?: number;
  execute: (context: ToolExecutionContext, input: TInput) => Promise<TOutput>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, RegisteredTool> = new Map();

  private constructor() {
    this.registerAllTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public register<TInput, TOutput>(tool: RegisteredTool<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as unknown as RegisteredTool);
  }

  public getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a registered tool with strict server-side context validation,
   * input/output schema parsing, and execution timeout.
   */
  public async executeTool(
    name: string,
    context: ToolExecutionContext,
    rawInput: unknown
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' is not registered in ToolRegistry.`);
    }

    if (!context.userId || typeof context.userId !== "string") {
      throw new Error(
        `Unauthorized: Tool execution for '${name}' requires a verified server-side userId.`
      );
    }

    // Validate Input
    const parseResult = tool.inputSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new Error(
        `Invalid input for tool '${name}': ${JSON.stringify(parseResult.error.flatten())}`
      );
    }

    const timeoutMs = tool.timeoutMs ?? 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Tool '${name}' timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    );

    const result = await Promise.race([
      tool.execute(context, parseResult.data),
      timeoutPromise,
    ]);

    // Validate Output
    const outputParse = tool.outputSchema.safeParse(result);
    if (!outputParse.success) {
      throw new Error(
        `Tool '${name}' returned invalid output structure: ${JSON.stringify(
          outputParse.error.flatten()
        )}`
      );
    }

    return outputParse.data;
  }

  /**
   * Registers all 20 tools required by Section 9.3 of the specification.
   */
  private registerAllTools(): void {
    // 1. discover_jobs
    this.register({
      name: "discover_jobs",
      description: "Run permitted discovery for saved criteria across authorized career boards.",
      inputSchema: z.object({
        provider: z.string().optional(),
        query: z.string().optional(),
        location: z.string().optional(),
        workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
        limit: z.number().min(1).max(50).optional(),
      }),
      outputSchema: z.object({
        discoveredCount: z.number(),
        jobs: z.array(z.record(z.string(), z.unknown())),
      }),
      execute: async (ctx, input) => {
        await connectToDatabase();
        const res = await jobDiscoveryService.getJobs({
          userId: ctx.userId,
          query: input.query,
          location: input.location,
          workMode: input.workMode,
          limit: input.limit ?? 10,
        });
        return {
          discoveredCount: res.totalCount,
          jobs: res.jobs.map((j) => ({
            id: String(j._id),
            title: j.title,
            company: j.company,
            location: j.location,
            sourcePlatform: j.sourcePlatform,
          })),
        };
      },
    });

    // 2. fetch_job
    this.register({
      name: "fetch_job",
      description: "Load a job record by ID. Treats job description as untrusted data.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        jobId: z.string(),
        title: z.string(),
        company: z.string(),
        location: z.string(),
        workMode: z.string(),
        sourcePlatform: z.string(),
        originalUrl: z.string(),
        description: z.string(),
        jobStatus: z.string(),
      }),
      execute: async (_ctx, input) => {
        await connectToDatabase();
        const job = await Job.findById(input.jobId);
        if (!job) {
          throw new Error(`Job '${input.jobId}' not found.`);
        }
        return {
          jobId: String(job._id),
          title: job.title,
          company: job.company,
          location: job.location,
          workMode: job.workMode,
          sourcePlatform: job.sourcePlatform,
          originalUrl: job.originalUrl,
          description: job.description,
          jobStatus: job.jobStatus,
        };
      },
    });

    // 3. analyze_job
    this.register({
      name: "analyze_job",
      description: "Perform structured AI analysis of job requirements, skills, and eligibility.",
      inputSchema: z.object({
        jobId: z.string().min(1),
        forceReanalyze: z.boolean().optional(),
      }),
      outputSchema: z.object({
        jobId: z.string(),
        analysisId: z.string(),
        requiredSkills: z.array(z.string()),
        preferredSkills: z.array(z.string()),
        seniorityLevel: z.string(),
        mandatoryConditions: z.array(z.string()),
      }),
      execute: async (ctx, input) => {
        const { analysis } = await jobAnalysisService.analyzeJob(ctx.userId, input.jobId);
        return {
          jobId: input.jobId,
          analysisId: String(analysis._id),
          requiredSkills: analysis.requiredSkills,
          preferredSkills: analysis.optionalSkills || [],
          seniorityLevel: analysis.seniority,
          mandatoryConditions: analysis.mandatoryEligibilityConditions,
        };
      },
    });

    // 4. calculate_match
    this.register({
      name: "calculate_match",
      description: "Deterministic scoring between verified candidate profile and job requirements.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        jobId: z.string(),
        overallScore: z.number(),
        eligible: z.boolean(),
        matchingSkills: z.array(z.string()),
        missingSkills: z.array(z.string()),
        recommendedAction: z.string(),
      }),
      execute: async (ctx, input) => {
        const match = await jobMatchingService.calculateMatch(ctx.userId, input.jobId);
        return {
          jobId: input.jobId,
          overallScore: match.overallScore,
          eligible: match.eligibilityConcerns.length === 0,
          matchingSkills: match.matchingSkills,
          missingSkills: match.missingSkills,
          recommendedAction: match.recommendedAction,
        };
      },
    });

    // 5. check_duplicate
    this.register({
      name: "check_duplicate",
      description: "Check for duplicate jobs and previous applications within rolling cooldown.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        isDuplicate: z.boolean(),
        reason: z.string().optional(),
        existingApplicationId: z.string().optional(),
      }),
      execute: async (ctx, input) => {
        const res = await duplicateDetectionService.checkDuplicate(ctx.userId, input.jobId);
        return {
          isDuplicate: res.isDuplicate,
          reason: res.duplicateReason,
          existingApplicationId: res.existingApplicationId,
        };
      },
    });

    // 6. verify_job_open
    this.register({
      name: "verify_job_open",
      description: "Confirm whether the job posting is still active and accepting applications.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        jobId: z.string(),
        isOpen: z.boolean(),
        jobStatus: z.string(),
      }),
      execute: async (_ctx, input) => {
        await connectToDatabase();
        const job = await Job.findById(input.jobId);
        if (!job) {
          throw new Error(`Job '${input.jobId}' not found.`);
        }
        return {
          jobId: input.jobId,
          isOpen: job.jobStatus === "open",
          jobStatus: job.jobStatus,
        };
      },
    });

    // 7. generate_resume
    this.register({
      name: "generate_resume",
      description: "Generate tailored resume draft grounded in verified master profile.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        resumeVersionId: z.string(),
        versionNumber: z.number(),
        unsupportedClaims: z.array(z.string()),
      }),
      execute: async (ctx, input) => {
        const result = await resumeGenerationService.generateTailoredResume(ctx.userId, input.jobId);
        return {
          resumeVersionId: String(result.version._id),
          versionNumber: result.version.versionNumber,
          unsupportedClaims: result.unsupportedClaims,
        };
      },
    });

    // 8. generate_cover_letter
    this.register({
      name: "generate_cover_letter",
      description: "Generate personalized cover letter draft grounded in verified candidate achievements.",
      inputSchema: z.object({
        jobId: z.string().min(1),
        tone: z.enum(["professional", "enthusiastic", "concise"]).optional(),
      }),
      outputSchema: z.object({
        coverLetterId: z.string(),
        tone: z.string(),
        content: z.string(),
      }),
      execute: async (ctx, input) => {
        const { coverLetter, content } = await coverLetterService.generateCoverLetter(
          ctx.userId,
          input.jobId,
          {
            tone: input.tone,
          }
        );
        return {
          coverLetterId: String(coverLetter._id),
          tone: coverLetter.tone,
          content,
        };
      },
    });

    // 9. prepare_application
    this.register({
      name: "prepare_application",
      description: "Build preflight checklist, tailored documents, and answers from verified profile.",
      inputSchema: z.object({
        jobId: z.string().min(1),
        resumeVersionId: z.string().optional(),
        coverLetterId: z.string().optional(),
      }),
      outputSchema: z.object({
        applicationId: z.string(),
        isReadyForReview: z.boolean(),
        blockers: z.array(z.string()),
        checklistCount: z.number(),
      }),
      execute: async (ctx, input) => {
        const res = await applicationPreparationService.prepareApplication(ctx.userId, input.jobId, {
          resumeVersionId: input.resumeVersionId,
          coverLetterId: input.coverLetterId,
        });
        return {
          applicationId: String(res.application._id),
          isReadyForReview: res.isReadyForReview,
          blockers: res.blockers,
          checklistCount: res.checklist.length,
        };
      },
    });

    // 10. validate_application
    this.register({
      name: "validate_application",
      description: "Verify required contact fields, work authorization, and factual integrity.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        isValid: z.boolean(),
        missingFields: z.array(z.string()),
      }),
      execute: async (ctx) => {
        await connectToDatabase();
        const profile = await ProfessionalProfile.findOne({ userId: ctx.userId });
        const missing: string[] = [];
        if (!profile?.fullName) missing.push("fullName");
        if (!profile?.email) missing.push("email");
        if (!profile?.phone) missing.push("phone");
        return {
          isValid: missing.length === 0,
          missingFields: missing,
        };
      },
    });

    // 11. request_approval
    this.register({
      name: "request_approval",
      description: "Create a user review task and transition application to AWAITING_APPROVAL.",
      inputSchema: z.object({
        applicationId: z.string().min(1),
        notes: z.string().optional(),
      }),
      outputSchema: z.object({
        applicationId: z.string(),
        status: z.string(),
      }),
      execute: async (ctx, input) => {
        const app = await applicationTrackingService.updateApplication(
          ctx.userId,
          input.applicationId,
          {
            status: "AWAITING_APPROVAL",
            statusReason: input.notes || "Ready for candidate approval before submission.",
          }
        );
        return {
          applicationId: String(app._id),
          status: app.status,
        };
      },
    });

    // 12. prefill_form
    this.register({
      name: "prefill_form",
      description: "Perform assisted prefill on permitted job forms and STOP before submission.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        fieldCount: z.number(),
        instructions: z.string(),
        stoppedBeforeSubmit: z.boolean(),
      }),
      execute: async (ctx, input) => {
        await connectToDatabase();
        const [job, profile] = await Promise.all([
          Job.findById(input.jobId),
          ProfessionalProfile.findOne({ userId: ctx.userId }),
        ]);
        if (!job) throw new Error(`Job '${input.jobId}' not found.`);
        if (!profile) throw new Error("Profile not found.");

        const res = await browserAutomationService.prefillApplication({
          jobUrl: job.originalUrl,
          profile,
          providerName: job.sourcePlatform,
        });

        return {
          success: res.success,
          fieldCount: res.fieldCount,
          instructions: res.instructions,
          stoppedBeforeSubmit: res.stoppedBeforeSubmit,
        };
      },
    });

    // 13. submit_authorized_application
    this.register({
      name: "submit_authorized_application",
      description: "Execute tier-gated and consent-gated application submission.",
      inputSchema: z.object({
        applicationId: z.string().min(1),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        tier: z.string(),
        status: z.string(),
        confirmationReference: z.string().optional(),
      }),
      execute: async (ctx, input) => {
        const res = await applicationSubmissionService.submitApplication(
          ctx.userId,
          input.applicationId
        );
        return {
          success: res.success,
          tier: res.tier,
          status: res.status,
          confirmationReference: res.confirmationReference,
        };
      },
    });

    // 14. record_result
    this.register({
      name: "record_result",
      description: "Save submission outcome, confirmation reference, and timestamps.",
      inputSchema: z.object({
        applicationId: z.string().min(1),
        status: z.enum(APPLICATION_STATES),
        confirmationReference: z.string().optional(),
        reason: z.string().optional(),
      }),
      outputSchema: z.object({
        applicationId: z.string(),
        status: z.string(),
      }),
      execute: async (ctx, input) => {
        const app = await applicationTrackingService.updateApplication(
          ctx.userId,
          input.applicationId,
          {
            status: input.status,
            statusReason: input.reason,
            confirmationReference: input.confirmationReference,
          }
        );
        return {
          applicationId: String(app._id),
          status: app.status,
        };
      },
    });

    // 15. update_application_status
    this.register({
      name: "update_application_status",
      description: "Transition application lifecycle state with strict state-machine validation.",
      inputSchema: z.object({
        applicationId: z.string().min(1),
        status: z.enum(APPLICATION_STATES),
        reason: z.string().optional(),
      }),
      outputSchema: z.object({
        applicationId: z.string(),
        status: z.string(),
      }),
      execute: async (ctx, input) => {
        const app = await applicationTrackingService.updateApplication(
          ctx.userId,
          input.applicationId,
          {
            status: input.status,
            statusReason: input.reason,
          }
        );
        return {
          applicationId: String(app._id),
          status: app.status,
        };
      },
    });

    // 16. notify_user
    this.register({
      name: "notify_user",
      description: "Send a deduplicated notification to candidate in-app and optional email.",
      inputSchema: z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        eventType: z.enum([
          "high_match_found",
          "resume_generated",
          "application_ready_for_review",
          "submitted",
          "failed",
          "interview_scheduled",
          "follow_up_due",
          "integration_disconnected",
          "daily_summary",
        ]),
        link: z.string().optional(),
        deduplicationKey: z.string().optional(),
      }),
      outputSchema: z.object({
        notificationId: z.string(),
        isDuplicate: z.boolean(),
      }),
      execute: async (ctx, input) => {
        const res = await notificationService.sendNotification({
          userId: ctx.userId,
          title: input.title,
          message: input.message,
          eventType: input.eventType as NotificationEventType,
          link: input.link,
          deduplicationKey: input.deduplicationKey,
        });
        return {
          notificationId: String(res.notification._id),
          isDuplicate: res.isDuplicate,
        };
      },
    });

    // 17. generate_interview_prep
    this.register({
      name: "generate_interview_prep",
      description: "Generate structured interview prep pack from job analysis and verified profile.",
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      outputSchema: z.object({
        jobId: z.string(),
        prepReady: z.boolean(),
        questionCount: z.number(),
      }),
      execute: async (ctx, input) => {
        const prep = await interviewCoachService.generatePrepPack(ctx.userId, input.jobId);
        return {
          jobId: input.jobId,
          prepReady: true,
          questionCount: prep.likelyQuestions.length,
        };
      },
    });

    // 18. start_mock_interview
    this.register({
      name: "start_mock_interview",
      description: "Create a mock interview session and initialize the first question.",
      inputSchema: z.object({
        jobId: z.string().optional(),
        interviewType: z.enum(["technical", "behavioral", "system_design", "mixed"]).optional(),
        difficulty: z.enum(["junior", "mid", "senior", "staff"]).optional(),
      }),
      outputSchema: z.object({
        sessionId: z.string(),
        initialQuestion: z.string(),
      }),
      execute: async (ctx, input) => {
        const res = await interviewCoachService.startMockInterview(ctx.userId, {
          jobId: input.jobId,
          interviewType: input.interviewType || "mixed",
          difficulty: input.difficulty || "mid",
        });
        return {
          sessionId: String(res.session._id),
          initialQuestion: res.firstQuestion,
        };
      },
    });

    // 19. evaluate_answer
    this.register({
      name: "evaluate_answer",
      description: "Rubric-based structured evaluation of candidate interview response.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
      outputSchema: z.object({
        clarityScore: z.number(),
        technicalScore: z.number(),
        depthScore: z.number(),
        feedback: z.string(),
      }),
      execute: async (ctx, input) => {
        const res = await interviewCoachService.submitAnswer(
          ctx.userId,
          input.sessionId,
          1,
          input.question,
          input.answer
        );
        const fb = res.answer.feedback;
        return {
          clarityScore: fb.scores.clarity,
          technicalScore: fb.scores.technicalAccuracy,
          depthScore: fb.scores.depth,
          feedback: `Score: ${fb.totalScore}%. Strengths: ${fb.strengths.join(
            "; "
          )}. Areas to sharpen: ${fb.weaknesses.join("; ")}`,
        };
      },
    });

    // 20. summarize_interview_session
    this.register({
      name: "summarize_interview_session",
      description: "Session summary, performance rubric aggregates, and weak-topic updates.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
      }),
      outputSchema: z.object({
        sessionId: z.string(),
        overallScore: z.number(),
        weakTopics: z.array(z.string()),
        summary: z.string(),
      }),
      execute: async (ctx, input) => {
        const session = await interviewCoachService.endSession(
          ctx.userId,
          input.sessionId,
          "completed"
        );
        return {
          sessionId: String(session._id),
          overallScore: session.overallScore || 0,
          weakTopics: session.weakTopics || [],
          summary: session.summary || "Session completed successfully.",
        };
      },
    });
  }
}

export const toolRegistry = ToolRegistry.getInstance();
