import { connectToDatabase } from "@/lib/db";
import { Application, type IApplication } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { Job } from "@/models/job";
import { ProfessionalProfile, type IProfessionalProfile } from "@/models/profile";
import { ResumeVersion } from "@/models/resume";
import { CoverLetter } from "@/models/cover-letter";
import { duplicateDetectionService, type DuplicateCheckResult } from "./duplicate-detection.service";
import { resumeGenerationService } from "./resume-generation.service";
import { coverLetterService } from "./cover-letter.service";
import { assertValidTransition } from "./application-state-machine";

export interface PreparationChecklistItem {
  category: "contact" | "resume" | "cover_letter" | "authorization" | "answers";
  label: string;
  status: "verified" | "warning" | "missing";
  value?: string;
  note?: string;
}

export interface PreparedApplicationResult {
  application: IApplication;
  duplicateCheck: DuplicateCheckResult;
  checklist: PreparationChecklistItem[];
  isReadyForReview: boolean;
  blockers: string[];
}

export class ApplicationPreparationService {
  /**
   * Prepares and packages an application for a target job:
   * 1. Performs duplicate detection
   * 2. Verifies master profile completeness & required fields
   * 3. Selects or auto-generates tailored resume version
   * 4. Selects or auto-generates tailored cover letter draft
   * 5. Builds factual answer checklist without hallucinations
   * 6. Updates Application state to READY_FOR_REVIEW with audit log
   */
  async prepareApplication(
    userId: string,
    jobId: string,
    options?: {
      resumeVersionId?: string;
      coverLetterId?: string;
      submissionMethod?: "auto" | "prefill" | "manual";
      forcePrepare?: boolean;
    }
  ): Promise<PreparedApplicationResult> {
    await connectToDatabase();

    const [profileDoc, job] = await Promise.all([
      ProfessionalProfile.findOne({ userId }),
      Job.findById(jobId),
    ]);

    if (!profileDoc) {
      throw new Error(
        "No verified professional profile found. Please complete your master profile before preparing applications."
      );
    }
    const profile = profileDoc as unknown as IProfessionalProfile;

    if (!job) {
      throw new Error(`Target job listing '${jobId}' not found.`);
    }

    // 1. Run Duplicate Detection
    const duplicateCheck = await duplicateDetectionService.checkDuplicate(userId, jobId);
    if (duplicateCheck.isDuplicate && !options?.forcePrepare) {
      // If exact duplicate exists, return existing application with warning
      if (duplicateCheck.existingApplicationId) {
        const existingApp = await Application.findById(duplicateCheck.existingApplicationId);
        if (existingApp) {
          return {
            application: existingApp,
            duplicateCheck,
            checklist: [],
            isReadyForReview: false,
            blockers: [duplicateCheck.duplicateReason || "Duplicate application detected."],
          };
        }
      }
    }

    const blockers: string[] = [];
    const checklist: PreparationChecklistItem[] = [];

    // 2. Validate Contact Information
    const hasName = Boolean(profile.fullName?.trim());
    const hasEmail = Boolean(profile.email?.trim());
    const hasPhone = Boolean(profile.phone?.trim());

    if (!hasName || !hasEmail) {
      blockers.push("Full name and verified email are mandatory.");
    }

    checklist.push({
      category: "contact",
      label: "Full Name",
      status: hasName ? "verified" : "missing",
      value: profile.fullName || "Missing",
    });

    checklist.push({
      category: "contact",
      label: "Email Address",
      status: hasEmail ? "verified" : "missing",
      value: profile.email || "Missing",
    });

    checklist.push({
      category: "contact",
      label: "Phone Number",
      status: hasPhone ? "verified" : "warning",
      value: profile.phone || "Not provided",
      note: hasPhone ? undefined : "Recommended for recruiter outreach.",
    });

    // 3. Resolve Tailored Resume Version
    let resumeVersionId = options?.resumeVersionId;
    if (!resumeVersionId) {
      // Look up existing tailored version for this user & job
      const existingVersion = await ResumeVersion.findOne({ userId, jobId }).sort({
        versionNumber: -1,
      });

      if (existingVersion) {
        resumeVersionId = String(existingVersion._id);
      } else {
        // Auto-generate tailored resume draft
        const tailored = await resumeGenerationService.generateTailoredResume(userId, jobId);
        resumeVersionId = String(tailored.version._id);
      }
    }

    const activeResumeVersion = await ResumeVersion.findById(resumeVersionId);
    if (!activeResumeVersion) {
      blockers.push("No valid tailored resume version could be resolved.");
      checklist.push({
        category: "resume",
        label: "Tailored Resume",
        status: "missing",
        note: "Failed to resolve or generate tailored resume draft.",
      });
    } else {
      const claimsDetected = activeResumeVersion.unsupportedClaimsDetected || [];
      checklist.push({
        category: "resume",
        label: `Tailored Resume (v${activeResumeVersion.versionNumber})`,
        status: claimsDetected.length > 0 ? "warning" : "verified",
        value: `Version ${activeResumeVersion.versionNumber}`,
        note:
          claimsDetected.length > 0
            ? `${claimsDetected.length} unsupported claim(s) flagged against master profile.`
            : "100% grounded in verified master profile.",
      });
    }

    // 4. Resolve Tailored Cover Letter
    let coverLetterId = options?.coverLetterId;
    if (!coverLetterId) {
      const existingLetter = await CoverLetter.findOne({ userId, jobId }).sort({
        createdAt: -1,
      });
      if (existingLetter) {
        coverLetterId = String(existingLetter._id);
      } else {
        // Auto-generate cover letter
        const generatedLetter = await coverLetterService.generateCoverLetter(userId, jobId, {
          tone: "professional",
        });
        coverLetterId = String(generatedLetter.coverLetter._id);
      }
    }

    const activeCoverLetter = await CoverLetter.findById(coverLetterId);
    checklist.push({
      category: "cover_letter",
      label: "Tailored Cover Letter",
      status: activeCoverLetter ? "verified" : "warning",
      value: activeCoverLetter ? `Tone: ${activeCoverLetter.tone}` : "Not generated",
      note: activeCoverLetter
        ? `${activeCoverLetter.content.split(/\s+/).length} words, customized for ${job.company}`
        : "Optional, but recommended to personalize your candidacy.",
    });

    // 5. Work Authorization Check
    const hasAuth =
      Array.isArray(profile.workAuthorization) && profile.workAuthorization.length > 0;
    const authStatus = hasAuth
      ? profile.workAuthorization.join(", ")
      : "Not specified";

    checklist.push({
      category: "authorization",
      label: "Work Authorization",
      status: hasAuth ? "verified" : "warning",
      value: authStatus,
      note: hasAuth
        ? "Verified from master profile."
        : "Employer may require legal sponsorship declaration.",
    });

    // 6. Find or Create Application record
    let app = await Application.findOne({ userId, jobId });

    if (!app) {
      app = await Application.create({
        userId,
        jobId,
        resumeVersionId: activeResumeVersion?._id,
        coverLetterId: activeCoverLetter?._id,
        status: "PREPARING",
        submissionMethod: options?.submissionMethod || "manual",
        duplicateChecked: true,
      });

      await ApplicationEvent.create({
        applicationId: app._id,
        userId,
        fromStatus: "DISCOVERED",
        toStatus: "PREPARING",
        reason: "Application preparation initiated.",
        details: { resumeVersionId, coverLetterId },
      });
    } else {
      app.resumeVersionId = activeResumeVersion?._id || app.resumeVersionId;
      app.coverLetterId = activeCoverLetter?._id || app.coverLetterId;
      app.duplicateChecked = true;
      if (options?.submissionMethod) {
        app.submissionMethod = options.submissionMethod;
      }
    }

    // 7. Transition to READY_FOR_REVIEW if no blockers exist
    const isReadyForReview = blockers.length === 0;
    if (isReadyForReview && app.status !== "READY_FOR_REVIEW") {
      const prevStatus = app.status;
      if (prevStatus === "PREPARING" || prevStatus === "DISCOVERED" || prevStatus === "SHORTLISTED") {
        assertValidTransition(prevStatus, "READY_FOR_REVIEW");
        app.status = "READY_FOR_REVIEW";
        await app.save();

        await ApplicationEvent.create({
          applicationId: app._id,
          userId,
          fromStatus: prevStatus,
          toStatus: "READY_FOR_REVIEW",
          reason: "Application materials compiled, verified, and ready for candidate review.",
          details: { checklistCount: checklist.length },
        });
      } else {
        await app.save();
      }
    } else {
      await app.save();
    }

    return {
      application: app,
      duplicateCheck,
      checklist,
      isReadyForReview,
      blockers,
    };
  }
}

export const applicationPreparationService = new ApplicationPreparationService();
