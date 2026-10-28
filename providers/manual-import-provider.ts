import {
  type DiscoveredJobItem,
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

export class ManualImportProvider implements JobSourceProvider {
  getProviderName(): string {
    return "Manual Import";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: true,
      submit: false,
      prefill: false,
      tier: "MANUAL",
      description:
        "Direct candidate import of job postings via URL, pasted job descriptions, or forwarded email alerts.",
      connectionInstructions:
        "No API keys required. Paste any job listing text or submit job URLs from your browser directly into JobPilot.",
      requiresAuth: false,
    };
  }

  async isConfigured(): Promise<boolean> {
    return true; // Always available without third-party credentials
  }

  async searchJobs(_criteria: JobSearchCriteria): Promise<JobSearchResult> {
    void _criteria;
    // Manual import provider processes direct candidate submissions
    return {
      jobs: [],
      totalCount: 0,
      hasMore: false,
      providerName: this.getProviderName(),
      statusMessage:
        "Manual Import is active. Use the 'Import Job' button to paste listings or add target job URLs.",
    };
  }

  normalizeImportedJob(raw: {
    title: string;
    company: string;
    description: string;
    location?: string;
    originalUrl?: string;
    workMode?: "remote" | "hybrid" | "onsite";
    employmentType?: "full-time" | "part-time" | "contract" | "internship";
    salaryRange?: { min?: number; max?: number; currency: string };
  }): DiscoveredJobItem {
    return {
      title: raw.title.trim(),
      company: raw.company.trim(),
      description: raw.description.trim(),
      location: (raw.location || "Remote").trim(),
      workMode: raw.workMode || "remote",
      employmentType: raw.employmentType || "full-time",
      salaryRange: raw.salaryRange,
      sourcePlatform: "Manual Import",
      originalUrl: raw.originalUrl?.trim() || "",
      postingDate: new Date(),
      applicationMethod: "manual",
    };
  }
}
