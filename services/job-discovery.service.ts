import { connectToDatabase } from "@/lib/db";
import { type IJob, Job } from "@/models/job";
import {
  type DiscoveredJobItem,
  type JobSearchCriteria,
  providerRegistry,
} from "@/providers";

export interface JobFilterParams {
  userId: string;
  query?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  location?: string;
  company?: string;
  sourcePlatform?: string;
  status?: "open" | "closed" | "expired";
  page?: number;
  limit?: number;
  sortBy?: "dateDiscovered" | "postingDate" | "matchScore";
  sortOrder?: "asc" | "desc";
  minMatchScore?: number;
}

export interface PaginatedJobsResult {
  jobs: IJob[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export class JobDiscoveryService {
  /**
   * Generates a deterministic duplicate group identifier from normalized company and title
   */
  public static generateDuplicateGroupId(
    company: string,
    title: string,
    location?: string
  ): string {
    const normCompany = company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
    const normTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
    const normLoc = (location || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

    return `${normCompany}:${normTitle}:${normLoc.slice(0, 8)}`;
  }

  /**
   * Retrieves paginated, filtered, and sorted jobs for a candidate
   */
  public async getJobs(params: JobFilterParams): Promise<PaginatedJobsResult> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $or: [{ userId: params.userId }, { userId: { $exists: false } }],
    };

    if (params.status) {
      filter.jobStatus = params.status;
    }

    if (params.workMode) {
      filter.workMode = params.workMode;
    }

    if (params.sourcePlatform) {
      filter.sourcePlatform = params.sourcePlatform;
    }

    if (params.minMatchScore !== undefined && params.minMatchScore > 0) {
      filter.matchScore = { $gte: params.minMatchScore };
    }

    if (params.location) {
      filter.location = { $regex: params.location, $options: "i" };
    }

    if (params.company) {
      filter.company = { $regex: params.company, $options: "i" };
    }

    if (params.query) {
      const regex = { $regex: params.query, $options: "i" };
      filter.$and = [
        {
          $or: [
            { title: regex },
            { company: regex },
            { description: regex },
            { requiredSkills: regex },
          ],
        },
      ];
    }

    const sortField = params.sortBy || "dateDiscovered";
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [jobs, totalCount] = await Promise.all([
      Job.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      jobs: jobs as unknown as IJob[],
      totalCount,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Imports a manual or user-provided job posting into the system
   */
  public async importJob(
    userId: string,
    rawJob: {
      title: string;
      company: string;
      description: string;
      location?: string;
      originalUrl?: string;
      workMode?: "remote" | "hybrid" | "onsite";
      employmentType?: "full-time" | "part-time" | "contract" | "internship";
      sourcePlatform?: string;
      salaryRange?: { min?: number; max?: number; currency: string };
    }
  ): Promise<{ job: IJob; isDuplicate: boolean }> {
    await connectToDatabase();

    const duplicateGroupId = JobDiscoveryService.generateDuplicateGroupId(
      rawJob.company,
      rawJob.title,
      rawJob.location
    );

    // Check for exact URL match for this user
    if (rawJob.originalUrl) {
      const existingExact = await Job.findOne({
        userId,
        originalUrl: rawJob.originalUrl.trim(),
      });

      if (existingExact) {
        existingExact.lastVerifiedDate = new Date();
        await existingExact.save();
        return { job: existingExact, isDuplicate: true };
      }
    }

    // Check for duplicate group match
    const existingGroup = await Job.findOne({
      userId,
      duplicateGroupId,
    });

    const isDuplicate = Boolean(existingGroup);

    // Clean untrusted description text
    const sanitizedDescription = rawJob.description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .trim();

    const newJob = await Job.create({
      userId,
      title: rawJob.title.trim(),
      company: rawJob.company.trim(),
      description: sanitizedDescription,
      location: (rawJob.location || "Remote").trim(),
      workMode: rawJob.workMode || "remote",
      employmentType: rawJob.employmentType || "full-time",
      sourcePlatform: rawJob.sourcePlatform || "Manual Import",
      originalUrl: rawJob.originalUrl?.trim() || "",
      salaryRange: rawJob.salaryRange || { currency: "USD" },
      dateDiscovered: new Date(),
      lastVerifiedDate: new Date(),
      jobStatus: "open",
      applicationMethod: "manual",
      duplicateGroupId,
    });

    return { job: newJob, isDuplicate };
  }

  /**
   * Runs discovery across a specified permitted provider
   */
  public async discoverFromProvider(
    userId: string,
    providerName: string,
    criteria: JobSearchCriteria
  ): Promise<{ discoveredCount: number; importedCount: number; message: string }> {
    const provider = providerRegistry.getProvider(providerName);

    if (!provider) {
      throw new Error(`Provider '${providerName}' is not registered.`);
    }

    const capabilities = provider.getCapabilities();
    if (!capabilities.discover) {
      return {
        discoveredCount: 0,
        importedCount: 0,
        message: `${provider.getProviderName()} does not support automated discovery (${capabilities.description}).`,
      };
    }

    const searchResult = await provider.searchJobs(criteria);
    let importedCount = 0;

    for (const item of searchResult.jobs) {
      const res = await this.saveDiscoveredJob(userId, item);
      if (res) {
        importedCount++;
      }
    }

    return {
      discoveredCount: searchResult.jobs.length,
      importedCount,
      message:
        searchResult.statusMessage ||
        `Discovered ${searchResult.jobs.length} jobs, imported ${importedCount} new listings.`,
    };
  }

  private async saveDiscoveredJob(
    userId: string,
    item: DiscoveredJobItem
  ): Promise<IJob | null> {
    await connectToDatabase();

    const duplicateGroupId = JobDiscoveryService.generateDuplicateGroupId(
      item.company,
      item.title,
      item.location
    );

    const existing = await Job.findOne({
      userId,
      $or: [
        { originalUrl: item.originalUrl },
        { duplicateGroupId },
      ],
    });

    if (existing) {
      existing.lastVerifiedDate = new Date();
      await existing.save();
      return null;
    }

    return Job.create({
      userId,
      title: item.title,
      company: item.company,
      companyWebsite: item.companyWebsite,
      description: item.description,
      location: item.location,
      workMode: item.workMode,
      employmentType: item.employmentType,
      sourcePlatform: item.sourcePlatform,
      originalUrl: item.originalUrl,
      postingDate: item.postingDate || new Date(),
      dateDiscovered: new Date(),
      lastVerifiedDate: new Date(),
      jobStatus: "open",
      applicationMethod: item.applicationMethod,
      duplicateGroupId,
    });
  }

  /**
   * Discovers jobs across permitted providers for a candidate
   */
  public async discoverJobs(
    userId: string,
    params: {
      query?: string;
      location?: string;
      providers?: string[];
      limit?: number;
    }
  ): Promise<{
    jobs: IJob[];
    summary: Record<string, number>;
  }> {
    await connectToDatabase();
    const targetProviders = params.providers || ["greenhouse", "lever"];
    const summary: Record<string, number> = {};

    for (const pName of targetProviders) {
      try {
        const res = await this.discoverFromProvider(userId, pName, {
          query: params.query || "Software Engineer",
          location: params.location || "Remote",
          limit: params.limit || 10,
        });
        summary[pName] = res.importedCount;
      } catch {
        summary[pName] = 0;
      }
    }

    const recentJobs = await Job.find({ userId })
      .sort({ createdAt: -1 })
      .limit(params.limit || 10);

    return {
      jobs: recentJobs,
      summary,
    };
  }
}

export const jobDiscoveryService = new JobDiscoveryService();
