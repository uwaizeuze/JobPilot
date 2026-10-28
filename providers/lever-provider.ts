import {
  type DiscoveredJobItem,
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

interface LeverPostingRaw {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  applyUrl: string;
  categories: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
  };
  descriptionPlain?: string;
  additionalPlain?: string;
  workplaceType?: string;
}

export class LeverProvider implements JobSourceProvider {
  getProviderName(): string {
    return "Lever Public Job Board";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: true,
      submit: false,
      prefill: true,
      tier: "PREFILL_ASSISTED",
      description:
        "Direct integration with employer career boards powered by Lever. Uses official public JSON posting feeds.",
      connectionInstructions:
        "Specify the company site name (e.g., 'netflix', 'spotify') to discover real-time verified postings.",
      requiresAuth: false,
    };
  }

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<JobSearchResult> {
    const company = criteria.companyToken?.trim().toLowerCase();

    if (!company) {
      return {
        jobs: [],
        totalCount: 0,
        hasMore: false,
        providerName: this.getProviderName(),
        statusMessage:
          "Provide a company identifier to query public Lever postings.",
      };
    }

    try {
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(
        company
      )}?mode=json`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        return {
          jobs: [],
          totalCount: 0,
          hasMore: false,
          providerName: this.getProviderName(),
          statusMessage: `Lever postings for '${company}' returned HTTP ${res.status}.`,
        };
      }

      const rawPostings = (await res.json()) as LeverPostingRaw[];

      const query = criteria.query?.toLowerCase();
      const filtered = (Array.isArray(rawPostings) ? rawPostings : []).filter(
        (p) => {
          if (!query) return true;
          const inTitle = p.text.toLowerCase().includes(query);
          const inLocation = p.categories?.location
            ?.toLowerCase()
            .includes(query);
          return inTitle || inLocation;
        }
      );

      const jobs: DiscoveredJobItem[] = filtered.map((p) => {
        const loc = p.categories?.location || "Remote";
        const isRemote =
          p.workplaceType === "remote" ||
          /remote/i.test(loc) ||
          /remote/i.test(p.text);

        return {
          title: p.text,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          companyWebsite: `https://jobs.lever.co/${company}`,
          description:
            p.descriptionPlain ||
            `Job posting for ${p.text} at ${company}.`,
          location: loc,
          workMode: isRemote ? "remote" : "onsite",
          employmentType: "full-time",
          sourcePlatform: "Lever",
          originalUrl: p.hostedUrl,
          postingDate: p.createdAt ? new Date(p.createdAt) : new Date(),
          applicationMethod: "prefill",
        };
      });

      return {
        jobs: jobs.slice(0, criteria.limit || 25),
        totalCount: jobs.length,
        hasMore: jobs.length > (criteria.limit || 25),
        providerName: this.getProviderName(),
        statusMessage: `Discovered ${jobs.length} postings from ${company} on Lever.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      return {
        jobs: [],
        totalCount: 0,
        hasMore: false,
        providerName: this.getProviderName(),
        statusMessage: `Error reaching Lever API: ${msg}`,
      };
    }
  }
}
