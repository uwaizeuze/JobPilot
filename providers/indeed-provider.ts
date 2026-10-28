import {
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

export class IndeedProvider implements JobSourceProvider {
  getProviderName(): string {
    return "Indeed";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: false,
      submit: false,
      prefill: false,
      tier: "MANUAL",
      description:
        "Manual tracking and tailoring for Indeed postings. Automated scraping or bot apply is not permitted.",
      connectionInstructions:
        "Indeed does not offer an open candidate-facing API. Use JobPilot's Manual Import tool to analyze job descriptions and track applications.",
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
        "Automated Indeed search is unavailable without an enterprise employer integration. Import Indeed postings via Manual Import.",
    };
  }
}
