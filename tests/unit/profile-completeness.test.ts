import { describe, expect, it } from "vitest";

import {
  calculateProfileCompleteness,
  type ProfileInputForCompleteness,
} from "../../lib/profile-completeness";

describe("deterministic profile completeness scoring", () => {
  it("returns 0 score and full missing items for empty profile", () => {
    const result = calculateProfileCompleteness(null);
    expect(result.score).toBe(0);
    expect(result.completedSections).toHaveLength(0);
    expect(result.missingItems.length).toBeGreaterThan(0);
  });

  it("calculates partial score when only contact info is provided", () => {
    const partialProfile: ProfileInputForCompleteness = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555-0199",
      currentLocation: "London, UK",
    };

    const result = calculateProfileCompleteness(partialProfile);
    expect(result.score).toBe(20);
    expect(result.completedSections).toContain("Contact Details");
    expect(result.missingItems).toContain(
      "At least 3 verified technical skills"
    );
  });

  it("returns 100% score when all verified sections are filled", () => {
    const fullProfile: ProfileInputForCompleteness = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555-0199",
      currentLocation: "London, UK",
      headline: "Pioneering Computer Scientist",
      summary: "First programmer in history, expert in algorithmic designs.",
      totalExperienceYears: 10,
      employmentHistory: [
        {
          company: "Analytical Engine Labs",
          title: "Chief Algorithmist",
          responsibilities: ["Developed algorithm for Bernoulli numbers."],
        },
      ],
      technicalSkills: [
        { name: "Algorithms" },
        { name: "Mathematics" },
        { name: "Machine Architecture" },
      ],
      education: [
        {
          institution: "University of London",
          degree: "Mathematics & Natural Sciences",
        },
      ],
      remotePreference: "remote",
      preferredLocations: ["London", "Remote"],
      workAuthorization: ["UK Authorized"],
      preferredSeniority: ["Principal"],
    };

    const result = calculateProfileCompleteness(fullProfile);
    expect(result.score).toBe(100);
    expect(result.completedSections).toContain("Contact Details");
    expect(result.completedSections).toContain("Professional Summary");
    expect(result.completedSections).toContain("Employment History");
    expect(result.completedSections).toContain("Technical Skills");
    expect(result.completedSections).toContain("Education & Projects");
    expect(result.completedSections).toContain("Work Preferences");
    expect(result.missingItems).toHaveLength(0);
  });

  it("caps score at 100 without exceeding bounds", () => {
    const profileWithExtra: ProfileInputForCompleteness = {
      fullName: "Alan Turing",
      email: "alan@example.com",
      phone: "+44 123456",
      currentLocation: "Bletchley",
      headline: "Mathematician & Logician",
      summary: "Father of theoretical computer science and artificial intelligence.",
      totalExperienceYears: 15,
      employmentHistory: [
        {
          company: "Bletchley Park",
          title: "Cryptanalyst",
          responsibilities: ["Deciphered Enigma codes."],
        },
      ],
      technicalSkills: [
        { name: "Turing Machines" },
        { name: "Cryptanalysis" },
        { name: "Logic" },
        { name: "Computability" },
      ],
      education: [
        {
          institution: "King's College, Cambridge",
          degree: "Ph.D. in Mathematics",
        },
      ],
      projects: [
        {
          title: "Bombe Machine",
          description: "Electromechanical code-breaking engine.",
        },
      ],
      remotePreference: "flexible",
      preferredLocations: ["Cambridge"],
    };

    const result = calculateProfileCompleteness(profileWithExtra);
    expect(result.score).toBe(100);
  });
});
