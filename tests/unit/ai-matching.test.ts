// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { IJob } from "@/models/job";
import type { IJobAnalysis } from "@/models/job-analysis";
import type { IProfessionalProfile } from "@/models/profile";
import { JobAnalysisService } from "@/services/job-analysis.service";
import { JobMatchingService } from "@/services/job-matching.service";

describe("Phase 5: Job Analysis & Deterministic Matching", () => {
  const analysisService = new JobAnalysisService();
  const matchingService = new JobMatchingService();

  describe("Deterministic Job Description Extraction", () => {
    it("extracts technical skills, experience years, and seniority from raw description text", () => {
      const description = `
        We are seeking a Senior Full-Stack Engineer with 5+ years of experience.
        Must have strong proficiency in TypeScript, React, Node.js, and PostgreSQL.
        Knowledge of AWS and Docker is preferred.
        Must be authorized to work in the US without sponsorship.
        Responsibilities:
        - Design and architect scalable cloud applications
        - Collaborate with product designers and frontend teams
      `;

      const result = analysisService.deterministicExtraction(
        "Senior Full-Stack Engineer",
        description,
        "Remote",
        "remote"
      );

      expect(result.requiredSkills).toContain("TypeScript");
      expect(result.requiredSkills).toContain("React");
      expect(result.requiredSkills).toContain("Node.js");
      expect(result.requiredExperienceYears).toBe(5);
      expect(result.seniority).toBe("Senior");
      expect(result.remoteEligibility).toBe(true);
      expect(result.mandatoryEligibilityConditions.length).toBeGreaterThan(0);
    });
  });

  describe("Deterministic Match Scoring & Component Breakdown", () => {
    const mockJob = {
      _id: "mock-job-123",
      title: "Senior Full-Stack Engineer",
      company: "Stripe",
      location: "Remote",
      workMode: "remote",
      requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      requiredExperience: 4,
    } as unknown as IJob;

    const mockAnalysis = {
      requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      education: "Bachelor's degree in Computer Science",
      responsibilities: ["Develop web apps"],
      seniority: "Senior",
      mandatoryEligibilityConditions: [],
      rawExtraction: { requiredExperienceYears: 4 },
    } as unknown as IJobAnalysis;

    it("evaluates a high match candidate with 100% skills and experience as APPLY", () => {
      const strongProfile = {
        headline: "Senior Full-Stack Engineer",
        technicalSkills: [
          { name: "TypeScript", proficiency: "expert" },
          { name: "React", proficiency: "expert" },
          { name: "Node.js", proficiency: "advanced" },
          { name: "PostgreSQL", proficiency: "advanced" },
          { name: "Next.js", proficiency: "advanced" },
        ],
        totalExperienceYears: 6,
        remotePreference: "remote",
        education: [{ degree: "B.S. Computer Science" }],
        workAuthorization: ["US Citizen"],
      } as unknown as IProfessionalProfile;

      const match = matchingService.evaluateMatch(strongProfile, mockJob, mockAnalysis);

      expect(match.overallScore).toBeGreaterThanOrEqual(85);
      expect(match.componentScores.skillsScore).toBe(100);
      expect(match.componentScores.experienceScore).toBe(100);
      expect(match.matchingSkills).toHaveLength(4);
      expect(match.missingSkills).toHaveLength(0);
      expect(match.recommendedAction).toBe("APPLY");
      expect(match.eligibilityConcerns).toHaveLength(0);
    });

    it("evaluates a partial match candidate with missing skills as TAILOR_FIRST", () => {
      const partialProfile = {
        headline: "Frontend Developer",
        technicalSkills: [
          { name: "React", proficiency: "intermediate" },
          { name: "JavaScript", proficiency: "advanced" },
        ],
        totalExperienceYears: 3,
        remotePreference: "remote",
        education: [{ degree: "B.S." }],
        workAuthorization: ["Eligible"],
      } as unknown as IProfessionalProfile;

      const match = matchingService.evaluateMatch(partialProfile, mockJob, mockAnalysis);

      expect(match.overallScore).toBeLessThan(80);
      expect(match.overallScore).toBeGreaterThanOrEqual(50);
      expect(match.matchingSkills).toContain("React");
      expect(match.missingSkills).toContain("TypeScript");
      expect(match.missingSkills).toContain("PostgreSQL");
      expect(match.recommendedAction).toBe("TAILOR_FIRST");
    });

    it("flags mandatory eligibility concerns separately from numerical score", () => {
      const jobWithClearance = {
        ...mockJob,
      } as unknown as IJob;

      const analysisWithClearance = {
        ...mockAnalysis,
        mandatoryEligibilityConditions: ["Must be US Citizen with Active Clearance"],
      } as unknown as IJobAnalysis;

      const profileWithoutAuth = {
        headline: "Senior Full-Stack Engineer",
        technicalSkills: [
          { name: "TypeScript", proficiency: "expert" },
          { name: "React", proficiency: "expert" },
          { name: "Node.js", proficiency: "advanced" },
          { name: "PostgreSQL", proficiency: "advanced" },
        ],
        totalExperienceYears: 6,
        remotePreference: "remote",
        workAuthorization: [], // Missing authorization
      } as unknown as IProfessionalProfile;

      const match = matchingService.evaluateMatch(
        profileWithoutAuth,
        jobWithClearance,
        analysisWithClearance
      );

      // Score is still technically high based on skills/experience
      expect(match.componentScores.skillsScore).toBe(100);
      // But action is caution due to mandatory condition
      expect(match.eligibilityConcerns.length).toBeGreaterThan(0);
      expect(match.recommendedAction).toBe("CAUTION_ELIGIBILITY");
    });
  });
});
