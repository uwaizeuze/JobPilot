import { connectToDatabase } from "@/lib/db";
import { type IJobAnalysis, JobAnalysis } from "@/models/job-analysis";
import { type IJob, Job } from "@/models/job";
import { type IProfessionalProfile, ProfessionalProfile } from "@/models/profile";
import { jobAnalysisService } from "./job-analysis.service";

export interface ComponentScores {
  skillsScore: number;
  experienceScore: number;
  locationScore: number;
  titleScore: number;
  educationScore: number;
}

export interface JobMatchResult {
  overallScore: number;
  componentScores: ComponentScores;
  matchingSkills: string[];
  missingSkills: string[];
  relevantExperience: string;
  eligibilityConcerns: string[];
  explanation: string;
  recommendedAction: "APPLY" | "TAILOR_FIRST" | "CAUTION_ELIGIBILITY" | "SKIP";
}

export interface MatchWeights {
  skillsWeight?: number;
  experienceWeight?: number;
  locationWeight?: number;
  titleWeight?: number;
  educationWeight?: number;
}

const DEFAULT_WEIGHTS = {
  skillsWeight: 0.4,
  experienceWeight: 0.25,
  locationWeight: 0.15,
  titleWeight: 0.1,
  educationWeight: 0.1,
};

export class JobMatchingService {
  /**
   * Calculates a deterministic match score and explainable breakdown
   */
  async calculateMatch(
    userId: string,
    jobId: string,
    customWeights?: MatchWeights
  ): Promise<JobMatchResult> {
    await connectToDatabase();

    const [job, profile] = await Promise.all([
      Job.findById(jobId),
      ProfessionalProfile.findOne({ userId }),
    ]);

    if (!job) {
      throw new Error(`Job listing '${jobId}' not found.`);
    }

    // Load or generate structured job analysis
    let analysis: IJobAnalysis | null = await JobAnalysis.findOne({ jobId: job._id });
    if (!analysis) {
      const analyzed = await jobAnalysisService.analyzeJob(userId, jobId);
      analysis = analyzed.analysis;
    }

    if (!analysis) {
      throw new Error(`Failed to generate job analysis for listing '${jobId}'.`);
    }

    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

    return this.evaluateMatch(profile, job, analysis, weights);
  }

  /**
   * Pure deterministic matching evaluation between candidate profile and analyzed job
   */
  public evaluateMatch(
    profile: IProfessionalProfile | null,
    job: IJob,
    analysis: IJobAnalysis,
    weights = DEFAULT_WEIGHTS
  ): JobMatchResult {
    const candidateSkills = (profile?.technicalSkills || []).map((s) => {
      if (typeof s === "string") return (s as string).toLowerCase().trim();
      return (s.name || "").toLowerCase().trim();
    });

    const requiredSkills = (
      analysis.requiredSkills.length > 0
        ? analysis.requiredSkills
        : job.requiredSkills || []
    ).map((s) => s.trim());

    // 1. Skills Matching
    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const reqSkill of requiredSkills) {
      const normReq = reqSkill.toLowerCase();
      const hasMatch = candidateSkills.some(
        (cand) => cand === normReq || cand.includes(normReq) || normReq.includes(cand)
      );

      if (hasMatch) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    const skillsScore =
      requiredSkills.length > 0
        ? Math.min(100, Math.round((matchingSkills.length / requiredSkills.length) * 100))
        : 75;

    // 2. Experience Matching
    const candidateExpYears = profile?.totalExperienceYears || 0;
    const requiredExpYears =
      job.requiredExperience ||
      (analysis.rawExtraction as { requiredExperienceYears?: number })
        ?.requiredExperienceYears ||
      0;

    let experienceScore = 100;
    if (requiredExpYears > 0) {
      if (candidateExpYears >= requiredExpYears) {
        experienceScore = 100;
      } else {
        experienceScore = Math.max(
          20,
          Math.min(100, Math.round((candidateExpYears / requiredExpYears) * 100))
        );
      }
    }

    const relevantExperience = `${candidateExpYears} years verified vs ${
      requiredExpYears > 0 ? `${requiredExpYears}+ years required` : "unspecified"
    }`;

    // 3. Location & Work Mode Matching
    let locationScore = 80;
    const candidateWorkMode = profile?.remotePreference || "remote";
    const jobWorkMode = job.workMode || "remote";

    if (candidateWorkMode === "remote" && jobWorkMode === "remote") {
      locationScore = 100;
    } else if (candidateWorkMode === "hybrid" && (jobWorkMode === "hybrid" || jobWorkMode === "remote")) {
      locationScore = 95;
    } else if (jobWorkMode === "onsite") {
      const preferredLocs = (profile?.preferredLocations || []).map((l) =>
        l.toLowerCase()
      );
      const isPreferred = preferredLocs.some((pref) =>
        job.location.toLowerCase().includes(pref)
      );
      locationScore = isPreferred ? 90 : 40;
    }

    // 4. Title & Seniority Relevance
    let titleScore = 70;
    const headline = (profile?.headline || "").toLowerCase();
    const jobTitle = job.title.toLowerCase();
    const keywords = [
      "frontend",
      "backend",
      "full-stack",
      "fullstack",
      "software",
      "engineer",
      "developer",
      "lead",
      "staff",
      "architect",
      "data",
      "devops",
    ];

    let matches = 0;
    for (const kw of keywords) {
      if (headline.includes(kw) && jobTitle.includes(kw)) {
        matches++;
      }
    }
    if (matches >= 2) titleScore = 100;
    else if (matches === 1) titleScore = 85;

    // 5. Education Matching
    let educationScore = 85;
    if (analysis.education && analysis.education !== "Not specified") {
      const hasEducation = (profile?.education || []).length > 0;
      educationScore = hasEducation ? 100 : 60;
    }

    // 6. Overall Weighted Score Calculation
    const overallScore = Math.round(
      weights.skillsWeight * skillsScore +
      weights.experienceWeight * experienceScore +
      weights.locationWeight * locationScore +
      weights.titleWeight * titleScore +
      weights.educationWeight * educationScore
    );

    // 7. Mandatory Eligibility Evaluation (Evaluated Separately from Score)
    const eligibilityConcerns: string[] = [];
    if (
      analysis.mandatoryEligibilityConditions &&
      analysis.mandatoryEligibilityConditions.length > 0
    ) {
      const hasAuth = (profile?.workAuthorization || []).length > 0;
      if (!hasAuth) {
        eligibilityConcerns.push(
          "Posting requires explicit work authorization / clearance. Verify your authorization status."
        );
      }
    }

    if (requiredExpYears > 0 && candidateExpYears < Math.floor(requiredExpYears / 2)) {
      eligibilityConcerns.push(
        `High experience gap: ${requiredExpYears} years required, profile has ${candidateExpYears} years.`
      );
    }

    // 8. Recommended Next Action
    let recommendedAction: "APPLY" | "TAILOR_FIRST" | "CAUTION_ELIGIBILITY" | "SKIP";
    if (eligibilityConcerns.length > 0) {
      recommendedAction = "CAUTION_ELIGIBILITY";
    } else if (overallScore >= 80) {
      recommendedAction = "APPLY";
    } else if (overallScore >= 60) {
      recommendedAction = "TAILOR_FIRST";
    } else {
      recommendedAction = "SKIP";
    }

    // 9. Structured Human-Readable Explanation
    const explanation = `Match score of ${overallScore}% calculated across verified qualifications. Candidate fulfills ${
      matchingSkills.length
    } of ${requiredSkills.length} required technical skills. Experience alignment is ${experienceScore}%. Location (${job.workMode}) fits candidate preference (${candidateWorkMode}).`;

    return {
      overallScore,
      componentScores: {
        skillsScore,
        experienceScore,
        locationScore,
        titleScore,
        educationScore,
      },
      matchingSkills,
      missingSkills,
      relevantExperience,
      eligibilityConcerns,
      explanation,
      recommendedAction,
    };
  }
}

export const jobMatchingService = new JobMatchingService();
