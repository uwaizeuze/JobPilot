import {
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

export class NaukriProvider implements JobSourceProvider {
  getProviderName(): string {
    return "Naukri";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: false,
      submit: false,
      prefill: false,
      tier: "MANUAL",
      description:
        "Manual tracking and tailoring for Naukri job listings.",
      connectionInstructions:
        "Naukri does not provide an authorized public API for candidate search. Import Naukri descriptions via JobPilot Manual Import.",
      requiresAuth: false,
    };
  }

  async isConfigured(): Promise<boolean> {
    return false;
  }

  async searchJobs(_criteria: JobSearchCriteria): Promise<JobSearchResult> {
    void _criteria;
    return {
      jobs: [],
      totalCount: 0,
      hasMore: false,
      providerName: this.getProviderName(),
      statusMessage:
        "Automated Naukri search is unavailable. Use Manual Import to track and prepare applications.",
    };
  }
}
