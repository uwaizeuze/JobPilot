export interface ExtractedSkill {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ExtractedEmployment {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface ExtractedEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

export interface ExtractedProject {
  title: string;
  description: string;
  technologies: string[];
}

export interface ExtractedProfileData {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  headline: string;
  summary: string;
  totalExperienceYears: number;
  technicalSkills: ExtractedSkill[];
  employmentHistory: ExtractedEmployment[];
  education: ExtractedEducation[];
  certifications: Array<{ name: string; issuer: string }>;
  projects: ExtractedProject[];
  urls: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
  rawSections: Record<string, string>;
  unextractedFields: string[];
}

const COMMON_TECH_SKILLS: Array<{ name: string; category: string }> = [
  // Languages
  { name: "TypeScript", category: "Languages" },
  { name: "JavaScript", category: "Languages" },
  { name: "Python", category: "Languages" },
  { name: "Go", category: "Languages" },
  { name: "Rust", category: "Languages" },
  { name: "Java", category: "Languages" },
  { name: "C++", category: "Languages" },
  { name: "C#", category: "Languages" },
  { name: "SQL", category: "Languages" },
  { name: "HTML/CSS", category: "Frontend" },

  // Frameworks & Libraries
  { name: "React", category: "Frontend" },
  { name: "Next.js", category: "Frontend" },
  { name: "Vue.js", category: "Frontend" },
  { name: "Angular", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "Express", category: "Backend" },
  { name: "NestJS", category: "Backend" },
  { name: "FastAPI", category: "Backend" },
  { name: "Django", category: "Backend" },
  { name: "Spring Boot", category: "Backend" },
  { name: "Tailwind CSS", category: "Frontend" },

  // Databases & Caches
  { name: "PostgreSQL", category: "Databases" },
  { name: "MySQL", category: "Databases" },
  { name: "MongoDB", category: "Databases" },
  { name: "Redis", category: "Databases" },
  { name: "Elasticsearch", category: "Databases" },

  // Cloud & DevOps
  { name: "AWS", category: "Cloud & DevOps" },
  { name: "GCP", category: "Cloud & DevOps" },
  { name: "Azure", category: "Cloud & DevOps" },
  { name: "Docker", category: "Cloud & DevOps" },
  { name: "Kubernetes", category: "Cloud & DevOps" },
  { name: "Terraform", category: "Cloud & DevOps" },
  { name: "CI/CD", category: "Cloud & DevOps" },
  { name: "Git", category: "Tools" },
  { name: "Linux", category: "Tools" },
  { name: "GraphQL", category: "Backend" },
];

export function extractProfileFromText(text: string): ExtractedProfileData {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawSections: Record<string, string> = {};
  const unextractedFields: string[] = [];

  // 1. Contact Extraction
  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // Phone
  const phoneMatch = text.match(
    /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/
  );
  const phone = phoneMatch && phoneMatch[0].length >= 10 ? phoneMatch[0].trim() : "";

  // URLs
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : "";

  const linkedinMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
  );
  const linkedin = linkedinMatch
    ? `https://linkedin.com/in/${linkedinMatch[1]}`
    : "";

  // Portfolio / personal website
  const httpUrls = Array.from(text.matchAll(/https?:\/\/([^\s|,"'>]+)/gi))
    .map((m) => m[1])
    .filter(
      (u) =>
        !u.toLowerCase().includes("github.com") &&
        !u.toLowerCase().includes("linkedin.com") &&
        !u.includes("@")
    );

  let portfolio = httpUrls.length > 0 ? `https://${httpUrls[0]}` : "";
  if (!portfolio) {
    const rawDomainMatch = text.match(
      /(?<![@\w.-])([a-zA-Z0-9-]+\.(?:dev|io|me|tech|site|online|app))\b/i
    );
    if (rawDomainMatch) {
      portfolio = `https://${rawDomainMatch[1]}`;
    }
  }

  // Full Name: Usually the first prominent non-contact line
  let fullName = "";
  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("linkedin") &&
      !line.includes("github") &&
      !line.toLowerCase().includes("resume") &&
      !line.toLowerCase().includes("curriculum") &&
      line.length >= 3 &&
      line.length <= 40
    ) {
      fullName = line;
      break;
    }
  }

  // Location heuristic
  const locationMatch = text.match(
    /(?:Location|Address|Based in)?[:\s]*([A-Z][a-zA-Z\s.-]+,\s*[A-Z]{2}\b|[A-Z][a-zA-Z\s.-]+,\s*[A-Z][a-zA-Z\s]+)/
  );
  const currentLocation = locationMatch ? locationMatch[1].trim() : "";

  // 2. Section Partitioning
  const sectionKeywords = [
    "summary",
    "professional summary",
    "profile",
    "experience",
    "work experience",
    "employment history",
    "education",
    "skills",
    "technical skills",
    "projects",
    "certifications",
  ];

  let currentSection = "header";
  let sectionContent: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:#_-]/g, "").trim();
    if (sectionKeywords.includes(lower)) {
      if (currentSection) {
        rawSections[currentSection] = sectionContent.join("\n");
      }
      currentSection = lower;
      sectionContent = [];
    } else {
      sectionContent.push(line);
    }
  }
  if (currentSection) {
    rawSections[currentSection] = sectionContent.join("\n");
  }

  // 3. Summary & Headline
  const summaryText =
    rawSections["summary"] ||
    rawSections["professional summary"] ||
    rawSections["profile"] ||
    "";
  const summary = summaryText ? summaryText.slice(0, 500).trim() : "";

  let headline = "";
  if (summary) {
    const firstSentence = summary.split(/[.\n]/)[0].trim();
    if (firstSentence.length <= 80) {
      headline = firstSentence;
    }
  }
  if (!headline && fullName) {
    headline = "Software Engineer";
  }

  // 4. Technical Skills Extraction (grounded against dictionary)
  const technicalSkills: ExtractedSkill[] = [];
  const lowerText = text.toLowerCase();

  for (const skill of COMMON_TECH_SKILLS) {
    // Regex word boundary matching
    const regex = new RegExp(`\\b${skill.name.toLowerCase().replace(/[+]/g, "\\+")}\\b`, "i");
    if (regex.test(lowerText)) {
      technicalSkills.push({
        name: skill.name,
        category: skill.category,
        proficiency: "intermediate",
      });
    }
  }

  // 5. Employment History Extraction
  const employmentHistory: ExtractedEmployment[] = [];
  const expSection =
    rawSections["experience"] ||
    rawSections["work experience"] ||
    rawSections["employment history"] ||
    "";

  if (expSection) {
    const expLines = expSection.split("\n").filter(Boolean);
    let currentJob: Partial<ExtractedEmployment> | null = null;

    for (const line of expLines) {
      // Look for date patterns like: 2020 - 2023, Jan 2021 - Present, 2019 - Present
      const dateMatch = line.match(
        /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{4})\s*[-–—to]+\s*(\d{4}|Present|Current)\b/i
      );

      if (dateMatch) {
        if (currentJob && currentJob.company && currentJob.title) {
          employmentHistory.push(currentJob as ExtractedEmployment);
        }

        const isCurrent = /present|current/i.test(dateMatch[2]);
        currentJob = {
          company: line.replace(dateMatch[0], "").trim().replace(/^[,|•-]\s*/, ""),
          title: "Software Engineer", // placeholder until refined by neighboring line
          startDate: dateMatch[1].trim(),
          endDate: isCurrent ? undefined : dateMatch[2].trim(),
          current: isCurrent,
          responsibilities: [],
          achievements: [],
        };
      } else if (currentJob) {
        if (
          !currentJob.title ||
          currentJob.title === "Software Engineer"
        ) {
          // If line contains common titles
          if (
            /(developer|engineer|architect|lead|manager|consultant|specialist|analyst)/i.test(
              line
            )
          ) {
            currentJob.title = line.trim();
            continue;
          }
        }

        // Bullet point responsibility
        if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
          const resp = line.replace(/^[•\-*]\s*/, "").trim();
          if (resp) {
            currentJob.responsibilities?.push(resp);
          }
        } else if (line.length > 20) {
          currentJob.responsibilities?.push(line);
        }
      }
    }

    if (currentJob && currentJob.company && currentJob.title) {
      employmentHistory.push(currentJob as ExtractedEmployment);
    }
  }

  // 6. Education Extraction
  const education: ExtractedEducation[] = [];
  const eduSection = rawSections["education"] || "";

  if (eduSection) {
    const degreeMatch = eduSection.match(
      /(B\.?S\.?|B\.?A\.?|B\.?Tech|M\.?S\.?|M\.?A\.?|M\.?Tech|Ph\.?D\.?|Bachelor|Master)[a-zA-Z\s.,()]+/i
    );
    const degree = degreeMatch ? degreeMatch[0].trim() : "Bachelor of Science";

    // Year match
    const yearMatch = eduSection.match(/\b(20\d{2}|19\d{2})\b/);
    const endYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    // School match heuristic: line containing University, College, Institute, School
    const schoolLine = eduSection
      .split("\n")
      .find((l) =>
        /(University|College|Institute|School|Polytechnic)/i.test(l)
      );
    const institution = schoolLine ? schoolLine.trim() : "University";

    education.push({
      institution,
      degree,
      endYear,
    });
  }

  // 7. Estimating Total Experience
  let totalExperienceYears = 0;
  if (employmentHistory.length > 0) {
    // If dates found, calculate rough span
    const years = employmentHistory
      .map((j) => {
        const start = parseInt(j.startDate.match(/\d{4}/)?.[0] || "0", 10);
        const end = j.current
          ? new Date().getFullYear()
          : parseInt(j.endDate?.match(/\d{4}/)?.[0] || `${new Date().getFullYear()}`, 10);
        return start > 0 ? Math.max(0, end - start) : 0;
      })
      .filter((y) => y > 0);

    totalExperienceYears = years.reduce((acc, y) => acc + y, 0);
  }

  // Record unextracted / missing items for candidate verification
  if (!phone) unextractedFields.push("phone number");
  if (!currentLocation) unextractedFields.push("current location");
  if (!summary) unextractedFields.push("summary / headline");
  if (employmentHistory.length === 0) unextractedFields.push("employment history");
  if (education.length === 0) unextractedFields.push("education credentials");

  return {
    fullName: fullName || "Candidate",
    email,
    phone,
    currentLocation,
    headline: headline || "Software Engineer",
    summary,
    totalExperienceYears: Math.min(totalExperienceYears, 40),
    technicalSkills,
    employmentHistory,
    education,
    certifications: [],
    projects: [],
    urls: {
      portfolio,
      github,
      linkedin,
    },
    rawSections,
    unextractedFields,
  };
}
