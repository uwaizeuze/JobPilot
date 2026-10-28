import {
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

export class LinkedInProvider implements JobSourceProvider {
  getProviderName(): string {
    return "LinkedIn";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: false,
      submit: false,
      prefill: false,
      tier: "MANUAL",
      description:
        "Manual tracking and tailoring for LinkedIn job listings. Automated scraping or bot-based application submission is strictly prohibited.",
      connectionInstructions:
        "LinkedIn does not offer an open public candidate API. Copy any LinkedIn job posting URL or job description and paste it into JobPilot's Manual Import tool to generate tailored resumes and track applications.",
      requiresAuth: false,
    };
  }

  async isConfigured(): Promise<boolean> {
    return false; // Honest status: No automated candidate API available
  }

  async searchJobs(_criteria: JobSearchCriteria): Promise<JobSearchResult> {
    void _criteria;
    return {
      jobs: [],
      totalCount: 0,
      hasMore: false,
      providerName: this.getProviderName(),
      statusMessage:
        "Automated LinkedIn search is unavailable because LinkedIn does not provide an authorized public candidate search API. Please import LinkedIn postings using JobPilot's Manual Import tool.",
    };
  }
}
