import { connectToDatabase } from "@/lib/db";
import { Application } from "@/models/application";
import { Job, type IJob } from "@/models/job";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateReason?: string;
  existingApplicationId?: string;
  existingStatus?: string;
  existingJobTitle?: string;
  existingCompany?: string;
  appliedAt?: Date;
  isRecentReapplication?: boolean;
}

export class DuplicateDetectionService {
  /**
   * Evaluates whether an application already exists for the given user and target job.
   * Checks:
   * 1. Exact user + job ID match
   * 2. Equivalent external job posting URL
   * 3. Same duplicateGroupId (normalized company:title:location)
   * 4. Recent application (within rollingDays, default 90) for same company + title
   */
  async checkDuplicate(
    userId: string,
    jobId: string,
    rollingDays = 90
  ): Promise<DuplicateCheckResult> {
    await connectToDatabase();

    const targetJob = await Job.findById(jobId);
    if (!targetJob) {
      return { isDuplicate: false };
    }

    // 1. Exact Application for this jobId
    const exactApp = await Application.findOne({ userId, jobId }).populate<{
      jobId: IJob;
    }>("jobId");
    if (exactApp) {
      return {
        isDuplicate: true,
        duplicateReason: `You already have an active application tracked for this exact listing (Status: ${exactApp.status}).`,
        existingApplicationId: String(exactApp._id),
        existingStatus: exactApp.status,
        existingJobTitle: exactApp.jobId?.title || targetJob.title,
        existingCompany: exactApp.jobId?.company || targetJob.company,
        appliedAt: exactApp.appliedDate || exactApp.createdAt,
      };
    }

    // 2. Cross-posting duplication by originalUrl
    if (targetJob.originalUrl) {
      const sameUrlJobs = await Job.find({
        originalUrl: targetJob.originalUrl,
        _id: { $ne: targetJob._id },
      }).select("_id");

      if (sameUrlJobs.length > 0) {
        const sameUrlJobIds = sameUrlJobs.map((j) => j._id);
        const urlDuplicateApp = await Application.findOne({
          userId,
          jobId: { $in: sameUrlJobIds },
        }).populate<{ jobId: IJob }>("jobId");

        if (urlDuplicateApp) {
          return {
            isDuplicate: true,
            duplicateReason: `An application already exists for this exact listing URL under another posting entry (Status: ${urlDuplicateApp.status}).`,
            existingApplicationId: String(urlDuplicateApp._id),
            existingStatus: urlDuplicateApp.status,
            existingJobTitle: urlDuplicateApp.jobId?.title || targetJob.title,
            existingCompany: urlDuplicateApp.jobId?.company || targetJob.company,
            appliedAt: urlDuplicateApp.appliedDate || urlDuplicateApp.createdAt,
          };
        }
      }
    }

    // 3. Duplicate Group ID check (same company + title + location normalized identifier)
    if (targetJob.duplicateGroupId) {
      const sameGroupJobs = await Job.find({
        duplicateGroupId: targetJob.duplicateGroupId,
        _id: { $ne: targetJob._id },
      }).select("_id");

      if (sameGroupJobs.length > 0) {
        const groupJobIds = sameGroupJobs.map((j) => j._id);
        const groupDuplicateApp = await Application.findOne({
          userId,
          jobId: { $in: groupJobIds },
        }).populate<{ jobId: IJob }>("jobId");

        if (groupDuplicateApp) {
          return {
            isDuplicate: true,
            duplicateReason: `Duplicate role detected: you are already tracking a matching listing at ${targetJob.company} for '${targetJob.title}' (Status: ${groupDuplicateApp.status}).`,
            existingApplicationId: String(groupDuplicateApp._id),
            existingStatus: groupDuplicateApp.status,
            existingJobTitle: groupDuplicateApp.jobId?.title || targetJob.title,
            existingCompany: groupDuplicateApp.jobId?.company || targetJob.company,
            appliedAt: groupDuplicateApp.appliedDate || groupDuplicateApp.createdAt,
          };
        }
      }
    }

    // 4. Rolling-window cooldown for same company and title (e.g. within 90 days)
    const rollingDateLimit = new Date();
    rollingDateLimit.setDate(rollingDateLimit.getDate() - rollingDays);

    const normTargetCompany = targetJob.company.toLowerCase().trim();
    const normTargetTitle = targetJob.title.toLowerCase().trim();

    // Query candidate's applications created or applied within the rolling window
    const candidateRecentApps = await Application.find({
      userId,
      createdAt: { $gte: rollingDateLimit },
      status: { $nin: ["CANCELLED", "WITHDRAWN"] },
    }).populate<{ jobId: IJob }>("jobId");

    for (const app of candidateRecentApps) {
      if (!app.jobId) continue;
      const comp = (app.jobId.company || "").toLowerCase().trim();
      const title = (app.jobId.title || "").toLowerCase().trim();

      if (
        (comp === normTargetCompany || comp.includes(normTargetCompany) || normTargetCompany.includes(comp)) &&
        (title === normTargetTitle || title.includes(normTargetTitle) || normTargetTitle.includes(title))
      ) {
        return {
          isDuplicate: true,
          isRecentReapplication: true,
          duplicateReason: `Recent application detected: you applied to ${app.jobId.company} for '${app.jobId.title}' on ${new Date(
            app.appliedDate || app.createdAt
          ).toLocaleDateString()} (within ${rollingDays} days). Many employers filter repeated applications within 90 days.`,
          existingApplicationId: String(app._id),
          existingStatus: app.status,
          existingJobTitle: app.jobId.title,
          existingCompany: app.jobId.company,
          appliedAt: app.appliedDate || app.createdAt,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Preflight check when importing a job description or URL manually
   */
  async checkExternalDuplicate(
    userId: string,
    company: string,
    title: string,
    originalUrl?: string,
    rollingDays = 90
  ): Promise<DuplicateCheckResult> {
    await connectToDatabase();

    const normCompany = (company || "").toLowerCase().trim();
    const normTitle = (title || "").toLowerCase().trim();

    const rollingDateLimit = new Date();
    rollingDateLimit.setDate(rollingDateLimit.getDate() - rollingDays);

    const recentApps = await Application.find({
      userId,
      createdAt: { $gte: rollingDateLimit },
      status: { $nin: ["CANCELLED", "WITHDRAWN"] },
    }).populate<{ jobId: IJob }>("jobId");

    for (const app of recentApps) {
      if (!app.jobId) continue;

      if (originalUrl && app.jobId.originalUrl && app.jobId.originalUrl === originalUrl) {
        return {
          isDuplicate: true,
          duplicateReason: `An application already exists for this exact listing URL (${app.status}).`,
          existingApplicationId: String(app._id),
          existingStatus: app.status,
          existingJobTitle: app.jobId.title,
          existingCompany: app.jobId.company,
          appliedAt: app.appliedDate || app.createdAt,
        };
      }

      const comp = (app.jobId.company || "").toLowerCase().trim();
      const t = (app.jobId.title || "").toLowerCase().trim();

      if (
        normCompany &&
        normTitle &&
        (comp === normCompany || comp.includes(normCompany) || normCompany.includes(comp)) &&
        (t === normTitle || t.includes(normTitle) || normTitle.includes(t))
      ) {
        return {
          isDuplicate: true,
          isRecentReapplication: true,
          duplicateReason: `You applied to ${app.jobId.company} for '${app.jobId.title}' recently (${app.status}).`,
          existingApplicationId: String(app._id),
          existingStatus: app.status,
          existingJobTitle: app.jobId.title,
          existingCompany: app.jobId.company,
          appliedAt: app.appliedDate || app.createdAt,
        };
      }
    }

    return { isDuplicate: false };
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
