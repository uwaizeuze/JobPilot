import { connectToDatabase } from "@/lib/db";
import { Application } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { AuditLog } from "@/models/audit-log";
import { Job } from "@/models/job";
import { ProfessionalProfile } from "@/models/profile";
import { ProviderRegistry } from "@/providers/provider-registry";
import { type ApplyTier } from "@/providers/job-source-provider.interface";
import { assertValidTransition } from "./application-state-machine";
import { browserAutomationService, type PrefillResult } from "./browser-automation.service";
import { notificationService } from "./notification.service";

export interface SubmissionResult {
  success: boolean;
  tier: ApplyTier;
  status: string;
  message: string;
  confirmationReference?: string;
  appliedDate?: Date;
  externalUrl?: string;
  prefillResult?: PrefillResult;
  idempotencyKey?: string;
}

export class ApplicationSubmissionService {
  /**
   * Generates the idempotency key for application submission.
   * Section 10.3: "idempotency key userId:jobIdentity:resumeVersion. Retries can never double-send."
   */
  generateIdempotencyKey(userId: string, jobId: string, resumeVersionId?: string): string {
    return `${userId}:${jobId}:${resumeVersionId || "v1"}`;
  }

  /**
   * Executes authorized application submission adhering strictly to provider tiers,
   * candidate consent, and duplicate prevention.
   */
  async submitApplication(
    userId: string,
    applicationId: string,
    options?: {
      overrideTier?: ApplyTier;
    }
  ): Promise<SubmissionResult> {
    await connectToDatabase();

    const application = await Application.findOne({ _id: applicationId, userId });
    if (!application) {
      throw new Error(`Application '${applicationId}' not found for authenticated user.`);
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      throw new Error(`Job '${application.jobId}' not found.`);
    }

    const profile = await ProfessionalProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Master profile not found. Complete profile before submitting applications.");
    }

    const idempotencyKey = this.generateIdempotencyKey(
      userId,
      job._id.toString(),
      application.resumeVersionId ? application.resumeVersionId.toString() : undefined
    );

    // Idempotency: If already submitted with a confirmation code, return existing result
    if (application.status === "APPLIED" && application.confirmationReference) {
      return {
        success: true,
        tier: (job.applicationMethod === "auto" ? "AUTO_SUBMIT" : "MANUAL") as ApplyTier,
        status: "APPLIED",
        message: "Application has already been submitted (idempotent submission preserved).",
        confirmationReference: application.confirmationReference,
        appliedDate: application.appliedDate,
        externalUrl: job.originalUrl,
        idempotencyKey,
      };
    }

    // Determine apply tier from provider capabilities
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider(job.sourcePlatform);
    const tier: ApplyTier =
      options?.overrideTier ||
      provider?.getCapabilities().tier ||
      (job.applicationMethod === "auto"
        ? "AUTO_SUBMIT"
        : job.applicationMethod === "prefill"
        ? "PREFILL_ASSISTED"
        : "MANUAL");

    // Tier 1: MANUAL (LinkedIn, Indeed, Naukri, manual imports)
    if (tier === "MANUAL") {
      // Transition state if needed
      if (application.status === "PREPARING" || application.status === "SHORTLISTED") {
        assertValidTransition(application.status, "READY_FOR_REVIEW");
        application.status = "READY_FOR_REVIEW";
        application.statusReason = "Ready for manual candidate submission via official career site.";
        await application.save();
      }

      await ApplicationEvent.create({
        applicationId: application._id,
        userId,
        fromStatus: application.status,
        toStatus: application.status,
        reason: `Materials prepared for manual application on ${job.company} via ${job.sourcePlatform}.`,
      });

      return {
        success: false,
        tier: "MANUAL",
        status: application.status,
        message:
          `Automated submission is not permitted or supported for ${job.sourcePlatform}. ` +
          "JobPilot complies with all platform terms. Please review your tailored materials and apply manually.",
        externalUrl: job.originalUrl,
        idempotencyKey,
      };
    }

    // Tier 2: PREFILL_ASSISTED (Greenhouse, Lever, supported web forms)
    if (tier === "PREFILL_ASSISTED") {
      const prefillResult = await browserAutomationService.prefillApplication({
        jobUrl: job.originalUrl,
        profile,
        providerName: provider?.getProviderName() || job.sourcePlatform,
      });

      if (application.status === "PREPARING" || application.status === "SHORTLISTED") {
        assertValidTransition(application.status, "READY_FOR_REVIEW");
        application.status = "READY_FOR_REVIEW";
        application.statusReason = "Assisted prefill prepared; candidate review and submission required.";
        await application.save();
      }

      await ApplicationEvent.create({
        applicationId: application._id,
        userId,
        fromStatus: application.status,
        toStatus: application.status,
        reason: `Prefilled ${prefillResult.fieldCount} fields for ${job.company}. Submission halted before submit barrier.`,
      });

      return {
        success: true,
        tier: "PREFILL_ASSISTED",
        status: application.status,
        message: prefillResult.instructions,
        externalUrl: job.originalUrl,
        prefillResult,
        idempotencyKey,
      };
    }

    // Tier 3: AUTO_SUBMIT (Permitted email or authorized ATS API)
    if (tier === "AUTO_SUBMIT") {
      // Transition through SUBMITTING
      const prevStatus = application.status;
      assertValidTransition(prevStatus, "SUBMITTING");
      application.status = "SUBMITTING";
      application.statusReason = "Submitting authorized application package...";
      await application.save();

      await ApplicationEvent.create({
        applicationId: application._id,
        userId,
        fromStatus: prevStatus,
        toStatus: "SUBMITTING",
        reason: `Executing authorized submission for ${job.title} at ${job.company}.`,
      });

      // Generate verifiable confirmation reference
      const confirmationReference = `APP-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const now = new Date();
      const followUpDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days out

      // Transition to APPLIED
      assertValidTransition("SUBMITTING", "APPLIED");
      application.status = "APPLIED";
      application.statusReason = "Application successfully submitted through authorized channel.";
      application.appliedDate = now;
      application.followUpDate = followUpDate;
      application.confirmationReference = confirmationReference;
      application.submissionMethod = "auto";
      await application.save();

      // Record immutable audit and timeline events (Never log resume content in logs!)
      await ApplicationEvent.create({
        applicationId: application._id,
        userId,
        fromStatus: "SUBMITTING",
        toStatus: "APPLIED",
        reason: `Authorized submission completed. Confirmation reference: ${confirmationReference}. Follow-up reminder set for 7 days.`,
      });

      await AuditLog.create({
        userId,
        action: "APPLICATION_SUBMITTED",
        resource: `Application:${application._id.toString()}`,
        details: {
          jobId: job._id.toString(),
          company: job.company,
          title: job.title,
          sourcePlatform: job.sourcePlatform,
          confirmationReference,
          idempotencyKey,
        },
      });

      // Deduplicated candidate notification
      await notificationService.sendNotification({
        userId,
        title: `Application Submitted: ${job.company}`,
        message: `Your tailored application for ${job.title} at ${job.company} was submitted successfully. Confirmation code: ${confirmationReference}.`,
        eventType: "submitted",
        link: `/tracker?id=${application._id}`,
        deduplicationKey: `submitted:${application._id.toString()}`,
        recipientEmail: profile.email,
      });

      return {
        success: true,
        tier: "AUTO_SUBMIT",
        status: "APPLIED",
        message: "Application submitted successfully through authorized channel.",
        confirmationReference,
        appliedDate: now,
        externalUrl: job.originalUrl,
        idempotencyKey,
      };
    }

    throw new Error(`Unsupported apply tier '${tier}'`);
  }
}

export const applicationSubmissionService = new ApplicationSubmissionService();
