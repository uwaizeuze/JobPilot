// @vitest-environment node
import { describe, expect, it } from "vitest";

import { extractProfileFromText } from "../../lib/resume-extractor";

describe("grounded deterministic resume data extraction", () => {
  const sampleResumeText = `
Ada Lovelace
London, UK | +1 (555) 234-5678 | ada.lovelace@computing.org
https://github.com/adalovelace | https://linkedin.com/in/adalovelace | https://ada-codes.dev

Professional Summary
Senior Software Engineer with 8 years of experience building mission-critical computing systems. Expert in distributed architectures and algorithms.

Technical Skills
Languages: TypeScript, JavaScript, Python, Go, SQL
Frameworks: React, Next.js, Node.js, Express, Tailwind CSS
Databases: PostgreSQL, MongoDB, Redis
Cloud & DevOps: Docker, Kubernetes, AWS, CI/CD, Git

Work Experience
Analytical Engine Systems | Lead Software Architect
2020 - Present | London, UK
• Architected scalable web services processing 10M transactions daily using Next.js and Go.
• Reduced infrastructure costs by 35% through containerized Kubernetes deployments on AWS.
• Mentored 6 junior engineers and established engineering best practices.

Babbage Computing Ltd | Software Engineer
2016 - 2020 | London, UK
• Developed core mathematical processing engines in Python and TypeScript.
• Maintained 99.99% uptime across production Redis and PostgreSQL clusters.

Education
University of London | Bachelor of Science in Mathematics
2012 - 2016
  `.trim();

  it("extracts verified candidate contact details without guessing", () => {
    const profile = extractProfileFromText(sampleResumeText);

    expect(profile.fullName).toBe("Ada Lovelace");
    expect(profile.email).toBe("ada.lovelace@computing.org");
    expect(profile.phone).toBe("+1 (555) 234-5678");
    expect(profile.currentLocation).toContain("London");
    expect(profile.urls.github).toBe("https://github.com/adalovelace");
    expect(profile.urls.linkedin).toBe("https://linkedin.com/in/adalovelace");
    expect(profile.urls.portfolio).toBe("https://ada-codes.dev");
  });

  it("extracts verified technical skills from dictionary without inventing unmentioned tech", () => {
    const profile = extractProfileFromText(sampleResumeText);
    const skillNames = profile.technicalSkills.map((s) => s.name);

    expect(skillNames).toContain("TypeScript");
    expect(skillNames).toContain("React");
    expect(skillNames).toContain("Next.js");
    expect(skillNames).toContain("Docker");
    expect(skillNames).toContain("Kubernetes");
    expect(skillNames).toContain("PostgreSQL");

    // Must NOT invent skills not in the resume
    expect(skillNames).not.toContain("Rust");
    expect(skillNames).not.toContain("Ruby");
    expect(skillNames).not.toContain("PHP");
  });

  it("extracts structured employment history with titles and responsibilities", () => {
    const profile = extractProfileFromText(sampleResumeText);

    expect(profile.employmentHistory.length).toBeGreaterThanOrEqual(1);
    const currentJob = profile.employmentHistory.find((j) => j.current);
    expect(currentJob).toBeDefined();
    expect(currentJob?.responsibilities.length).toBeGreaterThan(0);
  });

  it("extracts education credentials and graduation year", () => {
    const profile = extractProfileFromText(sampleResumeText);

    expect(profile.education.length).toBeGreaterThanOrEqual(1);
    const edu = profile.education[0];
    expect(edu.degree).toContain("Bachelor");
  });

  it("flags missing fields when a sparse resume is parsed", () => {
    const sparseResume = `
John Doe
john.doe@example.com
Experienced programmer seeking opportunities.
    `.trim();

    const profile = extractProfileFromText(sparseResume);
    expect(profile.email).toBe("john.doe@example.com");
    expect(profile.unextractedFields).toContain("phone number");
    expect(profile.unextractedFields).toContain("employment history");
  });
});
