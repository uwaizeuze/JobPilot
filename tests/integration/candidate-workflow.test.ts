import { describe, it, expect, vi, beforeEach } from "vitest";
import { jobMatchingService } from "@/services/job-matching.service";
import { interviewCoachService } from "@/services/interview-coach.service";
import { notificationService } from "@/services/notification.service";
import { checkRateLimit } from "@/lib/rate-limiter";
import { dataManagementService } from "@/services/data-management.service";
import {
  isValidTransition,
  assertValidTransition,
} from "@/services/application-state-machine";
import { User } from "@/models/user";
import { ProfessionalProfile } from "@/models/profile";
import { Resume, ResumeVersion } from "@/models/resume";
import { CoverLetter } from "@/models/cover-letter";
import { Application } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { Job } from "@/models/job";
import { JobAnalysis } from "@/models/job-analysis";
import { JobSourceConnection } from "@/models/connection";
import { AgentTask } from "@/models/agent-task";
import { Notification } from "@/models/notification";
import { UserPreference } from "@/models/preference";
import {
  InterviewPrepPack,
  MockInterviewSession,
  InterviewAnswer,
} from "@/models/interview";
import { AuditLog } from "@/models/audit-log";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

describe("Phase 12 Integration Suite: Candidate End-to-End Workflow", () => {
  const candidateId = "507f1f77bcf86cd799439011";
  const jobId = "507f1f77bcf86cd799439022";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integrates job discovery, deterministic qualification matching, and threshold alerts", async () => {
    // 1. Candidate profile with verified skills
    const candidateProfile = {
      technicalSkills: [
        { name: "TypeScript", level: "expert" },
        { name: "Next.js", level: "advanced" },
        { name: "Node.js", level: "expert" },
        { name: "Distributed Systems", level: "intermediate" },
        { name: "MongoDB", level: "advanced" },
        { name: "Redis", level: "intermediate" },
      ],
      yearsOfExperience: 6,
      targetRole: "Staff Software Engineer",
      desiredLocations: ["Remote"],
    };

    // 2. Job and structured job analysis
    const job = {
      _id: jobId,
      title: "Staff Software Engineer",
      company: "Acme Cloud",
      requiredSkills: ["TypeScript", "Next.js", "Node.js"],
      preferredSkills: ["Redis", "Distributed Systems"],
      experienceLevel: "mid",
      location: "Remote",
      workplaceType: "remote",
    };

    const jobAnalysis = {
      jobId,
      requiredSkills: ["TypeScript", "Next.js", "Node.js"],
      preferredSkills: ["Redis", "Distributed Systems"],
      minYearsExperience: 5,
      roleSeniority: "senior",
      locationRequirements: {
        allowsRemote: true,
        allowedLocations: ["Remote", "US"],
      },
    };

    // 3. Deterministic qualification matching
    const matchResult = jobMatchingService.evaluateMatch(
      candidateProfile as never,
      job as never,
      jobAnalysis as never,
      {
        skillsWeight: 0.4,
        experienceWeight: 0.25,
        locationWeight: 0.15,
        titleWeight: 0.1,
        educationWeight: 0.1,
      }
    );

    expect(matchResult.overallScore).toBeGreaterThanOrEqual(80);
    expect(matchResult.matchingSkills).toContain("TypeScript");
    expect(matchResult.matchingSkills).toContain("Next.js");
    expect(matchResult.recommendedAction).toBe("APPLY");

    // 4. Notification trigger for high-match roles (>=80%)
    vi.spyOn(Notification, "findOne").mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never);
    vi.spyOn(Notification, "create").mockResolvedValue({ _id: "notif-int-1" } as never);

    const notifResult = await notificationService.sendNotification({
      userId: candidateId,
      eventType: "high_match_found",
      title: `High-Match Job Discovered (${matchResult.overallScore}%)`,
      message: `Found ${job.title} at ${job.company} with an ${matchResult.overallScore}% qualification match score.`,
      link: `/jobs/preview?id=${jobId}`,
    });

    expect(notifResult.isDuplicate).toBe(false);
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: candidateId,
        eventType: "high_match_found",
      })
    );
  });

  it("integrates application lifecycle progression and strict state machine transitions", () => {
    // Initial state: DISCOVERED cannot jump directly to APPLIED
    expect(isValidTransition("DISCOVERED", "APPLIED")).toBe(false);
    expect(() => assertValidTransition("DISCOVERED", "APPLIED")).toThrow();

    // Valid progression: DISCOVERED -> SHORTLISTED
    expect(isValidTransition("DISCOVERED", "SHORTLISTED")).toBe(true);

    // SHORTLISTED -> PREPARING
    expect(isValidTransition("SHORTLISTED", "PREPARING")).toBe(true);

    // PREPARING -> READY_FOR_REVIEW
    expect(isValidTransition("PREPARING", "READY_FOR_REVIEW")).toBe(true);

    // READY_FOR_REVIEW -> SUBMITTING -> APPLIED
    expect(isValidTransition("READY_FOR_REVIEW", "SUBMITTING")).toBe(true);
    expect(isValidTransition("SUBMITTING", "APPLIED")).toBe(true);

    // APPLIED -> INTERVIEW -> OFFER
    expect(isValidTransition("APPLIED", "INTERVIEW")).toBe(true);
    expect(isValidTransition("INTERVIEW", "OFFER")).toBe(true);
  });

  it("integrates grounded interview prep pack generation and rubric breakdown", async () => {
    vi.spyOn(InterviewPrepPack, "findOne").mockResolvedValue(null);
    vi.spyOn(Job, "findById").mockResolvedValue({
      _id: jobId,
      title: "Senior Full Stack Engineer",
      company: "Acme Corp",
      requiredSkills: ["TypeScript", "Next.js", "Distributed Systems"],
      description: "Building resilient distributed cloud microservices with TypeScript and Next.js",
    } as never);

    vi.spyOn(ProfessionalProfile, "findOne").mockResolvedValue({
      userId: candidateId,
      headline: "Full Stack Architect",
      technicalSkills: [
        { name: "TypeScript", level: "expert" },
        { name: "Next.js", level: "advanced" },
      ],
      employmentHistory: [
        {
          title: "Senior Engineer",
          company: "TechFlow",
          startDate: "2021-01",
          current: true,
          achievements: ["Architected microservices handling 50k RPS with zero downtime"],
        },
      ],
    } as never);

    vi.spyOn(JobAnalysis, "findOne").mockResolvedValue({
      jobId,
      responsibilities: ["Lead engineering on high-throughput microservices"],
    } as never);

    vi.spyOn(UserPreference, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        tokensUsedThisMonth: 0,
        monthlyTokenBudget: 50000,
      }),
    } as never);

    (vi.spyOn(InterviewPrepPack, "create") as ReturnType<typeof vi.fn>).mockImplementation(
      async (payload) => ({
        _id: "pack-int-1",
        ...payload,
      })
    );

    const prepPack = await interviewCoachService.generatePrepPack(candidateId, jobId);

    expect(prepPack).toBeDefined();
    expect(prepPack.likelyQuestions.length).toBe(5);
    expect(prepPack.starOutlines.length).toBeGreaterThanOrEqual(1);

    // Verify grounded STAR outline references candidate's actual history
    const starStory = prepPack.starOutlines[0];
    expect(starStory.situation).toContain("TechFlow");
    expect(starStory.action).toContain("Architected microservices");

    // Verify honest bridging for missing skill
    const missingSkillOutline = prepPack.starOutlines.find((s) =>
      s.question.includes("Distributed Systems")
    );
    expect(missingSkillOutline).toBeDefined();
    expect(missingSkillOutline?.task).toContain("honestly without pretending");
  });

  it("integrates sliding window rate limiting and comprehensive data export sovereignty", async () => {
    const freshUserId = `user-int-${Date.now()}`;
    const mockReq = new Request("http://localhost/api/test");

    // Rate limiting: check standard and export buckets
    const standardLimit = checkRateLimit(mockReq, "standard", freshUserId);
    expect(standardLimit.success).toBe(true);
    expect(standardLimit.remaining).toBe(119); // limit 120 - 1

    const exportLimit = checkRateLimit(mockReq, "export", freshUserId);
    expect(exportLimit.success).toBe(true);
    expect(exportLimit.remaining).toBe(4); // limit 5 - 1

    // Comprehensive data export across collections
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: candidateId,
          name: "Candidate Test",
          email: "candidate@test.com",
        }),
      }),
    } as never);

    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue({
      lean: vi.fn().mockResolvedValue({ headline: "Lead Architect" }),
    } as never);

    vi.spyOn(Resume, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ title: "Primary Resume" }]),
    } as never);

    vi.spyOn(ResumeVersion, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(CoverLetter, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(Application, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(ApplicationEvent, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(InterviewPrepPack, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(MockInterviewSession, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(InterviewAnswer, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(JobSourceConnection, "find").mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as never);
    vi.spyOn(AgentTask, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(Notification, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(UserPreference, "findOne").mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    } as never);
    vi.spyOn(AuditLog, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

    const bundle = await dataManagementService.exportAllUserData(candidateId);
    expect(bundle.exportMetadata.userId).toBe(candidateId);
    expect(bundle.exportMetadata.accountEmail).toBe("candidate@test.com");
    expect(bundle.account.name).toBe("Candidate Test");
    expect(bundle.profile).toHaveProperty("headline", "Lead Architect");
    expect(bundle.resumes).toHaveLength(1);
  });
});
