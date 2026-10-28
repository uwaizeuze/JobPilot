export type ApplyTier = "AUTO_SUBMIT" | "PREFILL_ASSISTED" | "MANUAL";

export interface ProviderCapabilities {
  discover: boolean;
  submit: boolean;
  prefill: boolean;
  tier: ApplyTier;
  description: string;
  connectionInstructions?: string;
  requiresAuth?: boolean;
}

export interface JobSearchCriteria {
  query?: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  companyToken?: string;
  page?: number;
  limit?: number;
}

export interface DiscoveredJobItem {
  title: string;
  company: string;
  companyWebsite?: string;
  description: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  employmentType: "full-time" | "part-time" | "contract" | "internship";
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
  sourcePlatform: string;
  originalUrl: string;
  postingDate?: Date;
  applicationMethod: "auto" | "prefill" | "manual";
  applyEmail?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
}

export interface JobSearchResult {
  jobs: DiscoveredJobItem[];
  totalCount: number;
  hasMore: boolean;
  providerName: string;
  statusMessage?: string;
}

export interface JobSourceProvider {
  getProviderName(): string;
  getCapabilities(): ProviderCapabilities;
  isConfigured(): Promise<boolean>;
  searchJobs(criteria: JobSearchCriteria): Promise<JobSearchResult>;
}
