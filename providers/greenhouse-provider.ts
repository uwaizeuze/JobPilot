import {
  type DiscoveredJobItem,
  type JobSearchCriteria,
  type JobSearchResult,
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";

interface GreenhouseJobRaw {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  departments?: Array<{ name: string }>;
  offices?: Array<{ name: string }>;
}

export class GreenhouseProvider implements JobSourceProvider {
  getProviderName(): string {
    return "Greenhouse Public Job Board";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      discover: true,
      submit: false,
      prefill: true,
      tier: "PREFILL_ASSISTED",
      description:
        "Direct integration with public employer career boards powered by Greenhouse. Uses official public JSON job board APIs.",
      connectionInstructions:
        "Specify the company board token (e.g., 'stripe', 'gitlab', 'figma') to discover real-time verified postings.",
      requiresAuth: false,
    };
  }

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<JobSearchResult> {
    const boardToken = criteria.companyToken?.trim().toLowerCase();

    if (!boardToken) {
      return {
        jobs: [],
        totalCount: 0,
        hasMore: false,
        providerName: this.getProviderName(),
        statusMessage:
          "Provide a company board token (e.g. 'stripe', 'cloudflare') to query public Greenhouse postings.",
      };
    }

    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
        boardToken
      )}/jobs?content=true`;

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
          statusMessage: `Greenhouse board '${boardToken}' was not found or returned HTTP ${res.status}.`,
        };
      }

      const data = (await res.json()) as { jobs?: GreenhouseJobRaw[] };
      const rawJobs = data.jobs || [];

      // Filter by query if supplied
      const query = criteria.query?.toLowerCase();
      const filtered = rawJobs.filter((j) => {
        if (!query) return true;
        const inTitle = j.title.toLowerCase().includes(query);
        const inLocation = j.location?.name?.toLowerCase().includes(query);
        return inTitle || inLocation;
      });

      const jobs: DiscoveredJobItem[] = filtered.map((j) => {
        const loc = j.location?.name || "Remote / Unspecified";
        const isRemote = /remote/i.test(loc) || /remote/i.test(j.title);

        return {
          title: j.title,
          company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
          companyWebsite: `https://boards.greenhouse.io/${boardToken}`,
          description: j.content || `Job posting for ${j.title} at ${boardToken}.`,
          location: loc,
          workMode: isRemote ? "remote" : "onsite",
          employmentType: "full-time",
          sourcePlatform: "Greenhouse",
          originalUrl: j.absolute_url,
          postingDate: j.updated_at ? new Date(j.updated_at) : new Date(),
          applicationMethod: "prefill",
        };
      });

      return {
        jobs: jobs.slice(0, criteria.limit || 25),
        totalCount: jobs.length,
        hasMore: jobs.length > (criteria.limit || 25),
        providerName: this.getProviderName(),
        statusMessage: `Discovered ${jobs.length} postings from ${boardToken} on Greenhouse.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      return {
        jobs: [],
        totalCount: 0,
        hasMore: false,
        providerName: this.getProviderName(),
        statusMessage: `Error reaching Greenhouse API: ${msg}`,
      };
    }
  }
}
