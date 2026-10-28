export interface CompletenessResult {
  score: number;
  completedSections: string[];
  missingItems: string[];
  suggestions: string[];
}

export interface ProfileInputForCompleteness {
  fullName?: string;
  email?: string;
  phone?: string;
  currentLocation?: string;
  headline?: string;
  summary?: string;
  totalExperienceYears?: number;
  employmentHistory?: Array<{
    company?: string;
    title?: string;
    responsibilities?: string[];
  }>;
  technicalSkills?: Array<{
    name?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
  }>;
  projects?: Array<{
    title?: string;
    description?: string;
  }>;
  remotePreference?: string;
  preferredLocations?: string[];
  preferredSeniority?: string[];
  workAuthorization?: string[];
  expectedSalary?: number;
}

export function calculateProfileCompleteness(
  profile: ProfileInputForCompleteness | null | undefined
): CompletenessResult {
  if (!profile) {
    return {
      score: 0,
      completedSections: [],
      missingItems: [
        "Basic contact details",
        "Headline & summary",
        "Employment history",
        "Technical skills",
        "Education or projects",
        "Job search preferences",
      ],
      suggestions: [
        "Fill out your contact details to begin building your profile.",
      ],
    };
  }

  let score = 0;
  const completedSections: string[] = [];
  const missingItems: string[] = [];
  const suggestions: string[] = [];

  // 1. Basics (20 points)
  const hasBasics =
    Boolean(profile.fullName?.trim()) &&
    Boolean(profile.email?.trim()) &&
    Boolean(profile.phone?.trim()) &&
    Boolean(profile.currentLocation?.trim());

  if (hasBasics) {
    score += 20;
    completedSections.push("Contact Details");
  } else {
    missingItems.push("Full contact details (name, email, phone, location)");
    suggestions.push("Add complete contact details so employers can reach you.");
  }

  // 2. Professional Identity (20 points)
  const hasIdentity =
    Boolean(profile.headline?.trim()) &&
    Boolean(profile.summary?.trim()) &&
    typeof profile.totalExperienceYears === "number" &&
    profile.totalExperienceYears >= 0;

  if (hasIdentity) {
    score += 20;
    completedSections.push("Professional Summary");
  } else {
    missingItems.push("Professional headline, summary, and total years of experience");
    suggestions.push(
      "Add a compelling headline and professional summary to boost relevance scoring."
    );
  }

  // 3. Work History (25 points)
  const hasHistory =
    Array.isArray(profile.employmentHistory) &&
    profile.employmentHistory.length > 0 &&
    profile.employmentHistory.some(
      (entry) =>
        Boolean(entry.company?.trim()) &&
        Boolean(entry.title?.trim()) &&
        Array.isArray(entry.responsibilities) &&
        entry.responsibilities.length > 0
    );

  if (hasHistory) {
    score += 25;
    completedSections.push("Employment History");
  } else {
    missingItems.push("At least one employment position with responsibilities");
    suggestions.push(
      "Add your past employment history with key responsibilities to power resume tailoring."
    );
  }

  // 4. Technical Skills (15 points)
  const validSkills = (profile.technicalSkills || []).filter((s) =>
    Boolean(s.name?.trim())
  );
  if (validSkills.length >= 3) {
    score += 15;
    completedSections.push("Technical Skills");
  } else {
    missingItems.push("At least 3 verified technical skills");
    suggestions.push(
      "Add at least 3 technical skills to enable deterministic job matching."
    );
  }

  // 5. Education or Projects (10 points)
  const hasEducation =
    Array.isArray(profile.education) &&
    profile.education.length > 0 &&
    Boolean(profile.education[0].institution?.trim());

  const hasProjects =
    Array.isArray(profile.projects) &&
    profile.projects.length > 0 &&
    Boolean(profile.projects[0].title?.trim());

  if (hasEducation || hasProjects) {
    score += 10;
    completedSections.push("Education & Projects");
  } else {
    missingItems.push("At least one educational credential or technical project");
    suggestions.push(
      "Add education credentials or projects to show practical qualifications."
    );
  }

  // 6. Preferences & Authorization (10 points)
  const hasPreferences =
    Boolean(profile.remotePreference) &&
    ((profile.preferredLocations && profile.preferredLocations.length > 0) ||
      (profile.preferredSeniority && profile.preferredSeniority.length > 0) ||
      (profile.workAuthorization && profile.workAuthorization.length > 0));

  if (hasPreferences) {
    score += 10;
    completedSections.push("Work Preferences");
  } else {
    missingItems.push("Work preference (remote/onsite, locations, seniority)");
    suggestions.push(
      "Specify your remote preference and locations to filter irrelevant listings."
    );
  }

  return {
    score: Math.min(100, score),
    completedSections,
    missingItems,
    suggestions,
  };
}
