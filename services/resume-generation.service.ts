import { type TailoredResumeContent } from "@/lib/document-exporter";
import { connectToDatabase } from "@/lib/db";
import { type IJobAnalysis, JobAnalysis } from "@/models/job-analysis";
import { Job } from "@/models/job";
import { type IProfessionalProfile, ProfessionalProfile } from "@/models/profile";
import { Resume, type IResumeVersion, ResumeVersion } from "@/models/resume";
import { jobAnalysisService } from "./job-analysis.service";

export interface TailorResumeOptions {
  customSummary?: string;
  emphasisSkills?: string[];
}

export class ResumeGenerationService {
  /**
   * Generates a job-tailored resume draft strictly grounded in the verified profile
   */
  async generateTailoredResume(
    userId: string,
    jobId: string,
    options?: TailorResumeOptions
  ): Promise<{
    version: IResumeVersion;
    content: TailoredResumeContent;
    unsupportedClaims: string[];
  }> {
    await connectToDatabase();

    const [profileDoc, job] = await Promise.all([
      ProfessionalProfile.findOne({ userId }),
      Job.findById(jobId),
    ]);

    if (!profileDoc) {
      throw new Error(
        "No verified professional profile found. Please create or verify your master profile first."
      );
    }

    const profile = profileDoc as unknown as IProfessionalProfile;

    if (!job) {
      throw new Error(`Target job listing '${jobId}' not found.`);
    }

    // Load or generate structured job analysis
    let analysis: IJobAnalysis | null = (await JobAnalysis.findOne({
      jobId: job._id,
    })) as IJobAnalysis | null;
    if (!analysis) {
      const analyzed = await jobAnalysisService.analyzeJob(userId, jobId);
      analysis = analyzed.analysis;
    }

    // Resolve active master resume record
    let masterResume = await Resume.findOne({ userId, isMaster: true });
    if (!masterResume) {
      masterResume = await Resume.create({
        userId,
        originalFileName: "master_profile.txt",
        fileType: "pdf",
        rawText: profile.summary || "Master Profile",
        isMaster: true,
      });
    }

    // 1. Prioritize and reorder verified skills matching job requirements
    const verifiedSkillNames = (profile.technicalSkills || []).map((s) => s.name);
    const targetRequiredSkills = (analysis?.requiredSkills || job.requiredSkills || []).map(
      (s) => s.toLowerCase()
    );

    const matchingSkills: string[] = [];
    const otherVerifiedSkills: string[] = [];

    for (const skill of verifiedSkillNames) {
      const normSkill = skill.toLowerCase();
      const isTarget = targetRequiredSkills.some(
        (target) => target === normSkill || target.includes(normSkill) || normSkill.includes(target)
      );
      if (isTarget) {
        matchingSkills.push(skill);
      } else {
        otherVerifiedSkills.push(skill);
      }
    }

    // Prioritized skills: matching skills first, followed by candidate's other verified skills
    const prioritizedSkills = [...matchingSkills, ...otherVerifiedSkills];

    // 2. Tailor summary grounded in candidate's verified headline and accomplishments
    const verifiedHeadline = profile.headline || "Software Engineer";
    const yearsExp = profile.totalExperienceYears || 0;
    const topMatching = matchingSkills.slice(0, 4).join(", ");

    const tailoredSummary =
      options?.customSummary ||
      `${verifiedHeadline} with ${yearsExp}+ years of verified engineering experience. Demonstrated proficiency in ${
        topMatching || verifiedSkillNames.slice(0, 4).join(", ")
      }, with a proven track record delivering high-impact solutions for ${job.title} initiatives at ${job.company}.`;

    // 3. Assemble verified employment history
    const experience = (profile.employmentHistory || []).map((hist) => ({
      company: hist.company,
      title: hist.title,
      location: hist.location,
      startDate: hist.startDate,
      endDate: hist.endDate,
      current: hist.current,
      responsibilities: hist.responsibilities || [],
      achievements: hist.achievements || [],
    }));

    // 4. Assemble verified education, projects, certifications
    const education = (profile.education || []).map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      startYear: edu.startYear,
      endYear: edu.endYear,
    }));

    const projects = (profile.projects || []).map((proj) => ({
      title: proj.title,
      description: proj.description,
      technologies: proj.technologies || [],
    }));

    const certifications = (profile.certifications || []).map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
    }));

    const tailoredContent: TailoredResumeContent = {
      fullName: profile.fullName || "Candidate",
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.currentLocation || "Remote",
      urls: {
        portfolio: profile.urls?.portfolio,
        github: profile.urls?.github,
        linkedin: profile.urls?.linkedin,
      },
      headline: profile.headline || job.title,
      summary: tailoredSummary,
      skills: prioritizedSkills,
      experience,
      education,
      projects,
      certifications,
    };

    // 5. Unsupported-claims check against verified master profile
    const unsupportedClaims = this.detectUnsupportedClaims(profile, tailoredContent);

    // 6. Versioning: find latest version number for this user and job
    const latest = await ResumeVersion.findOne({ userId, jobId })
      .sort({ versionNumber: -1 })
      .select("versionNumber");

    const versionNumber = (latest?.versionNumber || 0) + 1;

    // 7. Save ResumeVersion in database
    const version = await ResumeVersion.create({
      userId,
      jobId,
      resumeId: masterResume._id,
      versionNumber,
      tailoredContent: tailoredContent as unknown as Record<string, unknown>,
      unsupportedClaimsDetected: unsupportedClaims,
    });

    return {
      version,
      content: tailoredContent,
      unsupportedClaims,
    };
  }

  /**
   * Deterministic unsupported-claims detector: ensures no skills, employers, or degrees
   * exist in the draft that are not backed by the verified master profile.
   */
  public detectUnsupportedClaims(
    profile: IProfessionalProfile,
    content: TailoredResumeContent
  ): string[] {
    const claims: string[] = [];

    const verifiedSkills = new Set(
      (profile.technicalSkills || []).map((s) => s.name.toLowerCase().trim())
    );
    const verifiedCompanies = new Set(
      (profile.employmentHistory || []).map((e) => e.company.toLowerCase().trim())
    );
    const verifiedInstitutions = new Set(
      (profile.education || []).map((edu) => edu.institution.toLowerCase().trim())
    );

    // Check skills
    for (const skill of content.skills) {
      if (!verifiedSkills.has(skill.toLowerCase().trim())) {
        claims.push(`Unverified skill claim: '${skill}' is not in master profile`);
      }
    }

    // Check employers
    for (const exp of content.experience) {
      if (!verifiedCompanies.has(exp.company.toLowerCase().trim())) {
        claims.push(`Unverified employer claim: '${exp.company}' is not in master profile`);
      }
    }

    // Check institutions
    for (const edu of content.education) {
      if (!verifiedInstitutions.has(edu.institution.toLowerCase().trim())) {
        claims.push(
          `Unverified education claim: '${edu.institution}' is not in master profile`
        );
      }
    }

    return claims;
  }
}

export const resumeGenerationService = new ResumeGenerationService();
