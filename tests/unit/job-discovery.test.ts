// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { GreenhouseProvider } from "@/providers/greenhouse-provider";
import { IndeedProvider } from "@/providers/indeed-provider";
import { LeverProvider } from "@/providers/lever-provider";
import { LinkedInProvider } from "@/providers/linkedin-provider";
import { ManualImportProvider } from "@/providers/manual-import-provider";
import { NaukriProvider } from "@/providers/naukri-provider";
import { providerRegistry } from "@/providers/provider-registry";
import { JobDiscoveryService } from "@/services/job-discovery.service";

describe("Phase 4: Job Discovery & Provider Architecture", () => {
  describe("JobDiscoveryService duplicate detection", () => {
    it("generates deterministic duplicateGroupId from company and title", () => {
      const id1 = JobDiscoveryService.generateDuplicateGroupId(
        "Acme Corp, Inc.",
        "Senior Frontend Engineer",
        "San Francisco, CA"
      );
      const id2 = JobDiscoveryService.generateDuplicateGroupId(
        "acme corp inc",
        "senior frontend engineer",
        "san francisco ca"
      );

      expect(id1).toBe(id2);
      expect(id1).toContain("acmecorpinc:seniorfrontendengineer");
    });

    it("distinguishes different job titles for the same company", () => {
      const id1 = JobDiscoveryService.generateDuplicateGroupId(
        "Acme",
        "Backend Developer"
      );
      const id2 = JobDiscoveryService.generateDuplicateGroupId(
        "Acme",
        "Product Designer"
      );

      expect(id1).not.toBe(id2);
    });

    it("distinguishes different companies for the same job title", () => {
      const id1 = JobDiscoveryService.generateDuplicateGroupId(
        "Google",
        "Software Engineer"
      );
      const id2 = JobDiscoveryService.generateDuplicateGroupId(
        "Meta",
        "Software Engineer"
      );

      expect(id1).not.toBe(id2);
    });
  });

  describe("Provider Registry & Honest Capabilities", () => {
    it("has all 6 core providers registered", async () => {
      const catalog = await providerRegistry.getCatalog();
      const names = catalog.map((p) => p.name.toLowerCase());

      expect(names.some((n) => n.includes("manual"))).toBe(true);
      expect(names.some((n) => n.includes("greenhouse"))).toBe(true);
      expect(names.some((n) => n.includes("lever"))).toBe(true);
      expect(names.some((n) => n.includes("linkedin"))).toBe(true);
      expect(names.some((n) => n.includes("indeed"))).toBe(true);
      expect(names.some((n) => n.includes("naukri"))).toBe(true);
    });

    it("honestly reports LinkedIn as MANUAL tier without automated scraping", async () => {
      const provider = new LinkedInProvider();
      const caps = provider.getCapabilities();
      const configured = await provider.isConfigured();

      expect(caps.tier).toBe("MANUAL");
      expect(caps.discover).toBe(false);
      expect(caps.submit).toBe(false);
      expect(caps.prefill).toBe(false);
      expect(configured).toBe(false);

      const search = await provider.searchJobs({});
      expect(search.jobs).toHaveLength(0);
      expect(search.statusMessage).toContain("unavailable");
    });

    it("honestly reports Indeed as MANUAL tier", async () => {
      const provider = new IndeedProvider();
      const caps = provider.getCapabilities();
      const configured = await provider.isConfigured();

      expect(caps.tier).toBe("MANUAL");
      expect(caps.discover).toBe(false);
      expect(caps.submit).toBe(false);
      expect(configured).toBe(false);
    });

    it("honestly reports Naukri as MANUAL tier", async () => {
      const provider = new NaukriProvider();
      const caps = provider.getCapabilities();
      const configured = await provider.isConfigured();

      expect(caps.tier).toBe("MANUAL");
      expect(caps.discover).toBe(false);
      expect(caps.submit).toBe(false);
      expect(configured).toBe(false);
    });

    it("supports Greenhouse Public Job Board with PREFILL_ASSISTED tier", async () => {
      const provider = new GreenhouseProvider();
      const caps = provider.getCapabilities();

      expect(caps.tier).toBe("PREFILL_ASSISTED");
      expect(caps.discover).toBe(true);
      expect(caps.prefill).toBe(true);
      expect(caps.submit).toBe(false);

      // Search without companyToken returns instructions
      const res = await provider.searchJobs({});
      expect(res.jobs).toHaveLength(0);
      expect(res.statusMessage).toContain("Provide a company board token");
    });

    it("supports Lever Public Job Board with PREFILL_ASSISTED tier", async () => {
      const provider = new LeverProvider();
      const caps = provider.getCapabilities();

      expect(caps.tier).toBe("PREFILL_ASSISTED");
      expect(caps.discover).toBe(true);
      expect(caps.prefill).toBe(true);
      expect(caps.submit).toBe(false);

      // Search without companyToken returns instructions
      const res = await provider.searchJobs({});
      expect(res.jobs).toHaveLength(0);
      expect(res.statusMessage).toContain("Provide a company identifier");
    });

    it("supports ManualImportProvider with candidate-pasted listings", async () => {
      const provider = new ManualImportProvider();
      const caps = provider.getCapabilities();
      const configured = await provider.isConfigured();

      expect(caps.tier).toBe("MANUAL");
      expect(configured).toBe(true);
    });
  });

  describe("Greenhouse & Lever live feed integration", () => {
    it("handles Greenhouse board JSON response formatting", async () => {
      const mockJobs = [
        {
          id: 101,
          title: "Senior Staff Engineer",
          updated_at: "2026-01-15T00:00:00Z",
          absolute_url: "https://boards.greenhouse.io/stripe/jobs/101",
          location: { name: "Remote - US" },
          content: "Full job description text",
        },
      ];

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs }),
      } as unknown as Response);

      try {
        const provider = new GreenhouseProvider();
        const res = await provider.searchJobs({ companyToken: "stripe", limit: 10 });

        expect(res.jobs).toHaveLength(1);
        expect(res.jobs[0].title).toBe("Senior Staff Engineer");
        expect(res.jobs[0].workMode).toBe("remote");
        expect(res.jobs[0].sourcePlatform).toBe("Greenhouse");
        expect(res.jobs[0].applicationMethod).toBe("prefill");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("handles Lever postings JSON response formatting", async () => {
      const mockPostings = [
        {
          id: "lev-202",
          text: "Full Stack Engineer",
          createdAt: 1735689600000,
          hostedUrl: "https://jobs.lever.co/netflix/lev-202",
          applyUrl: "https://jobs.lever.co/netflix/lev-202/apply",
          categories: { location: "San Francisco, CA" },
          descriptionPlain: "Build world class apps.",
          workplaceType: "hybrid",
        },
      ];

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPostings,
      } as unknown as Response);

      try {
        const provider = new LeverProvider();
        const res = await provider.searchJobs({ companyToken: "netflix", limit: 10 });

        expect(res.jobs).toHaveLength(1);
        expect(res.jobs[0].title).toBe("Full Stack Engineer");
        expect(res.jobs[0].sourcePlatform).toBe("Lever");
        expect(res.jobs[0].applicationMethod).toBe("prefill");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
