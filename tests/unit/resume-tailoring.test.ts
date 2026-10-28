// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { TailoredResumeContent } from "@/lib/document-exporter";
import type { IProfessionalProfile } from "@/models/profile";
import { ResumeGenerationService } from "@/services/resume-generation.service";

describe("Phase 6: Grounded Resume Tailoring & Unsupported Claims", () => {
  const service = new ResumeGenerationService();

  const mockVerifiedProfile = {
    fullName: "Ada Lovelace",
    headline: "Senior Software Engineer",
    totalExperienceYears: 6,
    technicalSkills: [
      { name: "TypeScript", proficiency: "expert" },
      { name: "React", proficiency: "expert" },
      { name: "Node.js", proficiency: "advanced" },
      { name: "PostgreSQL", proficiency: "advanced" },
    ],
    employmentHistory: [
      {
        company: "Acme Corp",
        title: "Lead Engineer",
        startDate: "2020",
        current: true,
        responsibilities: ["Built web apps"],
      },
    ],
    education: [
      {
        institution: "University of London",
        degree: "B.S. in Computer Science",
      },
    ],
  } as unknown as IProfessionalProfile;

  it("passes unsupported-claims check when all qualifications are verified in profile", () => {
    const validContent: TailoredResumeContent = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555-0100",
      location: "London",
      headline: "Senior Software Engineer",
      summary: "Grounded summary",
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      experience: [
        {
          company: "Acme Corp",
          title: "Lead Engineer",
          startDate: "2020",
          current: true,
          responsibilities: ["Built web apps"],
        },
      ],
      education: [
        {
          institution: "University of London",
          degree: "B.S. in Computer Science",
        },
      ],
    };

    const detected = service.detectUnsupportedClaims(mockVerifiedProfile, validContent);
    expect(detected).toHaveLength(0);
  });

  it("detects and flags unverified skill claims not in master profile", () => {
    const invalidSkillContent: TailoredResumeContent = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555-0100",
      location: "London",
      headline: "Senior Software Engineer",
      summary: "Grounded summary",
      skills: ["TypeScript", "Rust", "Golang", "Kubernetes"], // Rust, Golang, Kubernetes are not verified!
      experience: [
        {
          company: "Acme Corp",
          title: "Lead Engineer",
          startDate: "2020",
          current: true,
          responsibilities: ["Built web apps"],
        },
      ],
      education: [
        {
          institution: "University of London",
          degree: "B.S. in Computer Science",
        },
      ],
    };

    const detected = service.detectUnsupportedClaims(mockVerifiedProfile, invalidSkillContent);

    expect(detected.length).toBe(3);
    expect(detected.some((c) => c.includes("Rust"))).toBe(true);
    expect(detected.some((c) => c.includes("Golang"))).toBe(true);
    expect(detected.some((c) => c.includes("Kubernetes"))).toBe(true);
  });

  it("detects and flags fabricated employer claims", () => {
    const fabricatedEmployerContent: TailoredResumeContent = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555-0100",
      location: "London",
      headline: "Senior Software Engineer",
      summary: "Grounded summary",
      skills: ["TypeScript", "React"],
      experience: [
        {
          company: "Google", // Not in candidate's verified profile!
          title: "Senior Staff Architect",
          startDate: "2022",
          current: true,
          responsibilities: ["Led global cloud infrastructure"],
        },
      ],
      education: [
        {
          institution: "University of London",
          degree: "B.S. in Computer Science",
        },
      ],
    };

    const detected = service.detectUnsupportedClaims(mockVerifiedProfile, fabricatedEmployerContent);

    expect(detected.length).toBeGreaterThan(0);
    expect(detected.some((c) => c.includes("Google"))).toBe(true);
  });
});
