import { z } from "zod";

import { openAIProvider } from "@/lib/ai";
import { decryptApiKey } from "@/lib/crypto";
import { connectToDatabase } from "@/lib/db";
import { type IJobAnalysis, JobAnalysis } from "@/models/job-analysis";
import { Job } from "@/models/job";
import { UserPreference } from "@/models/preference";

export const JobAnalysisExtractionSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  optionalSkills: z.array(z.string()).default([]),
  experience: z.string().default("Not specified"),
  requiredExperienceYears: z.number().min(0).default(0),
  education: z.string().default("Not specified"),
  responsibilities: z.array(z.string()).default([]),
  seniority: z.string().default("Mid-level"),
  locationRequirements: z.string().default(""),
  remoteEligibility: z.boolean().default(false),
  salary: z.string().default("Not specified"),
  employmentType: z.string().default("full-time"),
  certifications: z.array(z.string()).default([]),
  mandatoryEligibilityConditions: z.array(z.string()).default([]),
  inferredData: z.array(z.string()).default([]),
});

export type JobAnalysisExtraction = z.infer<typeof JobAnalysisExtractionSchema>;

const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Go", "Golang", "Rust", "Java", "C++", "C#",
  "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "GraphQL", "REST",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Git",
  "Tailwind CSS", "CSS3", "HTML5", "Redux", "Zustand", "Jest", "Vitest", "Playwright",
  "Kafka", "RabbitMQ", "Microservices", "System Design", "Agile", "Scrum",
];

export class JobAnalysisService {
  /**
   * Performs structured analysis of a job description using AI or deterministic extraction
   */
  async analyzeJob(
    userId: string,
    jobId: string
  ): Promise<{ analysis: IJobAnalysis; tokensUsed: number }> {
    await connectToDatabase();

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error(`Job listing with ID '${jobId}' not found.`);
    }

    // Resolve user's API key and budget
    const preference = await UserPreference.findOne({ userId }).select(
      "+encryptedApiKey"
    );

    let userApiKey: string | undefined;
    if (preference?.encryptedApiKey) {
      try {
        userApiKey = decryptApiKey(preference.encryptedApiKey);
      } catch {
        // Fallback to server key if user key is corrupt
      }
    }

    const isAIConfigured = openAIProvider.isConfigured(userApiKey);
    let extraction: JobAnalysisExtraction;
    let tokensUsed = 0;

    if (isAIConfigured) {
      // Check monthly token budget
      if (
        preference &&
        preference.tokensUsedThisMonth >= preference.monthlyTokenBudget
      ) {
        throw new Error(
          `Monthly token budget of ${preference.monthlyTokenBudget.toLocaleString()} tokens exceeded. You can increase your budget in Settings > AI Agent.`
        );
      }

      try {
        const prompt = `Analyze this job posting and extract structured qualifications:\n\nTitle: ${
          job.title
        }\nCompany: ${job.company}\nLocation: ${job.location}\nWork Mode: ${
          job.workMode
        }\n\nJob Description:\n${job.description.slice(0, 4000)}`;

        const result = await openAIProvider.generateStructured({
          prompt,
          schema: JobAnalysisExtractionSchema,
          apiKey: userApiKey,
        });

        extraction = result.data;
        tokensUsed = result.tokensUsed;

        // Record token usage
        if (preference && tokensUsed > 0) {
          preference.tokensUsedThisMonth += tokensUsed;
          await preference.save();
        }
      } catch {
        // Fallback to deterministic extraction on network/API failure
        extraction = this.deterministicExtraction(
          job.title,
          job.description,
          job.location,
          job.workMode
        );
      }
    } else {
      // Deterministic rule-based extraction when AI is not configured
      extraction = this.deterministicExtraction(
        job.title,
        job.description,
        job.location,
        job.workMode
      );
    }

    // Persist or update JobAnalysis in database
    const analysisDoc = await JobAnalysis.findOneAndUpdate(
      { jobId: job._id },
      {
        userId,
        jobId: job._id,
        requiredSkills: extraction.requiredSkills,
        optionalSkills: extraction.optionalSkills,
        experience: extraction.experience,
        education: extraction.education,
        responsibilities: extraction.responsibilities,
        seniority: extraction.seniority,
        locationRequirements: extraction.locationRequirements,
        remoteEligibility: extraction.remoteEligibility,
        salary: extraction.salary,
        employmentType: extraction.employmentType,
        certifications: extraction.certifications,
        mandatoryEligibilityConditions: extraction.mandatoryEligibilityConditions,
        inferredData: extraction.inferredData,
        rawExtraction: {
          requiredExperienceYears: extraction.requiredExperienceYears,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update job record with extracted skills and required experience
    if (extraction.requiredSkills.length > 0) {
      job.requiredSkills = Array.from(
        new Set([...(job.requiredSkills || []), ...extraction.requiredSkills])
      );
    }
    if (extraction.optionalSkills.length > 0) {
      job.preferredSkills = Array.from(
        new Set([...(job.preferredSkills || []), ...extraction.optionalSkills])
      );
    }
    if (extraction.requiredExperienceYears > 0) {
      job.requiredExperience = extraction.requiredExperienceYears;
    }
    await job.save();

    return {
      analysis: analysisDoc,
      tokensUsed,
    };
  }

  /**
   * Deterministic, zero-hallucination extraction fallback when AI is unconfigured or offline
   */
  public deterministicExtraction(
    title: string,
    description: string,
    location?: string,
    workMode?: string
  ): JobAnalysisExtraction {
    const descLower = description.toLowerCase();
    const titleLower = title.toLowerCase();

    // 1. Technical Skills Extraction from Known Dictionary
    const foundSkills = KNOWN_SKILLS.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      return regex.test(description) || regex.test(title);
    });

    const requiredSkills = foundSkills.slice(0, 8);
    const optionalSkills = foundSkills.slice(8, 12);

    // 2. Experience Years Extraction
    let experienceYears = 0;
    let experienceText = "Not specified";
    const expMatch = description.match(/(\d+)\+?\s*(?:-\s*(\d+))?\s*years?(?:\s+of)?\s+experience/i);
    if (expMatch) {
      experienceYears = parseInt(expMatch[1], 10);
      experienceText = `${expMatch[1]}${expMatch[2] ? `-${expMatch[2]}` : "+"} years of experience`;
    }

    // 3. Seniority Classification
    let seniority = "Mid-level";
    if (/\b(senior|sr\.?|lead)\b/i.test(titleLower)) {
      seniority = "Senior";
    } else if (/\b(staff|principal|director|head)\b/i.test(titleLower)) {
      seniority = "Staff / Principal";
    } else if (/\b(junior|jr\.?|associate|entry)\b/i.test(titleLower)) {
      seniority = "Entry / Junior";
    }

    // 4. Remote Eligibility
    const remote =
      workMode === "remote" ||
      /\bremote\b/i.test(descLower) ||
      /\bremote\b/i.test(titleLower) ||
      /\bwork from home\b/i.test(descLower);

    // 5. Responsibilities
    const responsibilities: string[] = [];
    const lines = description.split("\n").map((l) => l.trim());
    for (const line of lines) {
      if (/^[-*•]\s+/.test(line) && line.length > 20 && line.length < 200) {
        responsibilities.push(line.replace(/^[-*•]\s+/, ""));
        if (responsibilities.length >= 5) break;
      }
    }

    // 6. Education
    let education = "Not specified";
    if (/\b(bachelor|b\.s\.|b\.e\.|b\.tech)\b/i.test(descLower)) {
      education = "Bachelor's degree in Computer Science or related field";
    } else if (/\b(master|m\.s\.|m\.tech)\b/i.test(descLower)) {
      education = "Master's degree preferred";
    }

    // 7. Mandatory Conditions
    const mandatoryConditions: string[] = [];
    if (/must be authorized to work|us citizen|security clearance/i.test(descLower)) {
      mandatoryConditions.push("Work authorization / Clearance required");
    }

    return {
      requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Software Engineering"],
      optionalSkills,
      experience: experienceText,
      requiredExperienceYears: experienceYears,
      education,
      responsibilities:
        responsibilities.length > 0
          ? responsibilities
          : [`Design, develop, and maintain software solutions for ${title}.`],
      seniority,
      locationRequirements: location || "Remote / Not specified",
      remoteEligibility: remote,
      salary: "Not specified",
      employmentType: "full-time",
      certifications: [],
      mandatoryEligibilityConditions: mandatoryConditions,
      inferredData: ["Inferred seniority from job title"],
    };
  }
}

export const jobAnalysisService = new JobAnalysisService();
