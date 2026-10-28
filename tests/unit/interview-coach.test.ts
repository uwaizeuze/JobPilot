import { beforeEach, describe, expect, it, vi } from "vitest";
import { Application, type IApplication } from "@/models/application";
import {
  InterviewAnswer,
  InterviewPrepPack,
  MockInterviewSession,
  type IInterviewAnswer,
  type IInterviewPrepPack,
  type IMockInterviewSession,
} from "@/models/interview";
import { Job, type IJob } from "@/models/job";
import { JobAnalysis } from "@/models/job-analysis";
import { UserPreference } from "@/models/preference";
import { ProfessionalProfile, type IProfessionalProfile } from "@/models/profile";
import { InterviewCoachService } from "@/services/interview-coach.service";
import { notificationService } from "@/services/notification.service";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asJobQuery = (val: unknown) => val as unknown as ReturnType<typeof Job.findById>;
const asProfileQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof ProfessionalProfile.findOne>;
const asPrepQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof InterviewPrepPack.findOne>;
const asSessionQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof MockInterviewSession.findOne>;
const asPrefQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof UserPreference.findOne>;
const asAppQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.findOne>;

describe("InterviewCoachService", () => {
  let service: InterviewCoachService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InterviewCoachService();
  });

  describe("generatePrepPack", () => {
    it("generates a grounded prep pack with 5 question categories and STAR outlines", async () => {
      vi.spyOn(InterviewPrepPack, "findOne").mockReturnValue(asPrepQuery(Promise.resolve(null)));

      const mockJob = {
        _id: "job-1",
        title: "Senior Backend Engineer",
        company: "Stripe",
        requiredSkills: ["Go", "Distributed Systems", "Kubernetes"],
        description: "Scale high-throughput payment pipelines.",
      } as unknown as IJob;

      const mockProfile = {
        userId: "user-1",
        technicalSkills: [
          { name: "Go", proficiency: "advanced" },
          { name: "PostgreSQL", proficiency: "expert" },
        ],
        employmentHistory: [
          {
            company: "Acme FinTech",
            title: "Staff Software Engineer",
            startDate: "2021-01",
            current: true,
            achievements: ["Built multi-region ledger reducing settlement latency by 45%"],
          },
        ],
      } as unknown as IProfessionalProfile;

      vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));
      vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
        asProfileQuery(Promise.resolve(mockProfile))
      );
      vi.spyOn(JobAnalysis, "findOne").mockReturnValue(
        Promise.resolve({
          responsibilities: ["Lead payment reliability", "Architect ledger engines"],
        }) as unknown as ReturnType<typeof JobAnalysis.findOne>
      );
      vi.spyOn(UserPreference, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          tokensUsedThisMonth: 0,
          monthlyTokenBudget: 100000,
        }),
      } as unknown as ReturnType<typeof UserPreference.findOne>);

      (vi.spyOn(InterviewPrepPack, "create") as ReturnType<typeof vi.fn>).mockImplementation(
        async (payload) =>
          ({
            _id: "pack-1",
            ...payload,
          } as unknown as IInterviewPrepPack)
      );

      const prepPack = await service.generatePrepPack("user-1", "job-1");

      expect(prepPack).toBeDefined();
      expect(prepPack.likelyQuestions.length).toBe(5);

      const categories = prepPack.likelyQuestions.map((q) => q.category);
      expect(categories).toContain("technical");
      expect(categories).toContain("behavioral");
      expect(categories).toContain("system_design");
      expect(categories).toContain("role_specific");
      expect(categories).toContain("culture");

      // Grounded STAR outlines check
      expect(prepPack.starOutlines.length).toBeGreaterThanOrEqual(1);
      const star = prepPack.starOutlines[0];
      expect(star.situation).toContain("Acme FinTech");
      expect(star.action).toContain("Built multi-region ledger");

      // Honest bridging for missing skill (Distributed Systems)
      const bridgeStar = prepPack.starOutlines.find((s) =>
        s.question.includes("Distributed Systems")
      );
      expect(bridgeStar).toBeDefined();
      expect(bridgeStar?.task).toContain("honestly without pretending");

      // Skill gaps roadmap
      expect(prepPack.skillGaps.some((g) => g.skill === "Kubernetes")).toBe(true);
      expect(prepPack.checklist.length).toBeGreaterThanOrEqual(4);
      expect(prepPack.questionsForInterviewer.length).toBeGreaterThanOrEqual(4);
    });

    it("returns existing prep pack without regenerating when forceRegenerate is false", async () => {
      const existingPack = {
        _id: "pack-cached",
        userId: "user-1",
        jobId: "job-1",
        likelyQuestions: [{ category: "technical", question: "Existing Q" }],
      } as unknown as IInterviewPrepPack;

      vi.spyOn(InterviewPrepPack, "findOne").mockReturnValue(
        asPrepQuery(Promise.resolve(existingPack))
      );

      const res = await service.generatePrepPack("user-1", "job-1", false);
      expect(res._id).toBe("pack-cached");
      expect(Job.findById).not.toHaveBeenCalled();
    });
  });

  describe("startMockInterview & rubric evaluation", () => {
    it("aborts session start if candidate token budget is exceeded", async () => {
      vi.spyOn(UserPreference, "findOne").mockReturnValue(
        asPrefQuery(
          Promise.resolve({
            tokensUsedThisMonth: 50000,
            monthlyTokenBudget: 50000,
          })
        )
      );

      await expect(
        service.startMockInterview("user-1", {
          interviewType: "technical",
          difficulty: "senior",
        })
      ).rejects.toThrow(/Monthly token budget.*exceeded/);
    });

    it("initializes mock session and asks the first question based on role and difficulty", async () => {
      vi.spyOn(UserPreference, "findOne").mockReturnValue(
        asPrefQuery(
          Promise.resolve({
            tokensUsedThisMonth: 100,
            monthlyTokenBudget: 50000,
          })
        )
      );

      (vi.spyOn(MockInterviewSession, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: "session-1",
        userId: "user-1",
        status: "in_progress",
        interviewType: "system_design",
        difficulty: "senior",
      } as unknown as IMockInterviewSession);

      const res = await service.startMockInterview("user-1", {
        roleTitle: "Staff Infrastructure Engineer",
        interviewType: "system_design",
        difficulty: "senior",
      });

      expect(res.session._id).toBe("session-1");
      expect(res.firstQuestion).toContain("system design");
      expect(res.firstQuestion).toContain("rate limiter");
    });

    it("evaluates candidate answer deterministically against the 5 rubric pillars", async () => {
      const mockSession = {
        _id: "session-1",
        userId: "user-1",
        status: "in_progress",
        interviewType: "technical",
        difficulty: "senior",
        weakTopics: [],
        save: vi.fn(),
      } as unknown as IMockInterviewSession;

      vi.spyOn(MockInterviewSession, "findOne").mockReturnValue(
        asSessionQuery(Promise.resolve(mockSession))
      );

      vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
        asProfileQuery(
          Promise.resolve({
            technicalSkills: [{ name: "Kafka" }, { name: "PostgreSQL" }],
          })
        )
      );

      vi.spyOn(UserPreference, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      } as unknown as ReturnType<typeof UserPreference.findOne>);

      (vi.spyOn(InterviewAnswer, "create") as ReturnType<typeof vi.fn>).mockImplementation(
        async (payload) =>
          ({
            _id: "ans-1",
            ...payload,
          } as unknown as IInterviewAnswer)
      );

      const detailedAnswer =
        "In our core payment architecture, the situation was that Kafka ingestion bottlenecks caused 400ms latency spikes. My task was redesigning the partition strategy and consumer concurrency. The action I took was implementing keyed partition hashing in Go and tuning PostgreSQL connection pools with metric tracking. As a result, we reduced tail latency by 65% and improved throughput.";

      const evalRes = await service.submitAnswer(
        "user-1",
        "session-1",
        1,
        "How did you address concurrency bottlenecks in your service?",
        detailedAnswer,
        4
      );

      expect(evalRes.answer).toBeDefined();
      const scores = evalRes.answer.feedback.scores;

      // Rubric scores must be bounded 0-100
      expect(scores.clarity).toBeGreaterThan(50);
      expect(scores.structure).toBeGreaterThan(60);
      expect(scores.technicalAccuracy).toBeGreaterThan(60);
      expect(scores.depth).toBeGreaterThan(50);
      expect(scores.relevance).toBeGreaterThan(60);

      // Weighted formula: clarity 15% + structure 20% + technical 25% + depth 20% + relevance 20%
      const expectedWeighted = Math.round(
        scores.clarity * 0.15 +
          scores.structure * 0.2 +
          scores.technicalAccuracy * 0.25 +
          scores.depth * 0.2 +
          scores.relevance * 0.2
      );
      expect(evalRes.answer.feedback.totalScore).toBe(expectedWeighted);

      // Strengths & weaknesses
      expect(evalRes.answer.feedback.strengths.length).toBeGreaterThan(0);
      expect(evalRes.answer.feedback.sampleAnswer).toBeDefined();
      expect(evalRes.isCompleted).toBe(false);
      expect(evalRes.nextQuestion).toBeDefined();
    });

    it("aggregates rubric summary, overall score, and practice plan upon session completion", async () => {
      const mockSession = {
        _id: "session-done",
        userId: "user-1",
        weakTopics: [],
        save: vi.fn().mockImplementation(function (this: IMockInterviewSession) {
          return Promise.resolve(this);
        }),
      } as unknown as IMockInterviewSession;

      vi.spyOn(MockInterviewSession, "findOne").mockReturnValue(
        asSessionQuery(Promise.resolve(mockSession))
      );

      const mockAnswers = [
        {
          questionNumber: 1,
          questionText: "Q1",
          feedback: {
            scores: {
              clarity: 80,
              structure: 85,
              technicalAccuracy: 90,
              depth: 75,
              relevance: 90,
            },
            totalScore: 84,
          },
        },
        {
          questionNumber: 2,
          questionText: "Q2",
          feedback: {
            scores: {
              clarity: 70,
              structure: 65,
              technicalAccuracy: 60,
              depth: 60,
              relevance: 75,
            },
            totalScore: 65,
          },
        },
      ];

      vi.spyOn(InterviewAnswer, "find").mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockAnswers),
      } as unknown as ReturnType<typeof InterviewAnswer.find>);

      const completedSession = await service.endSession(
        "user-1",
        "session-done",
        "completed"
      );

      expect(completedSession.status).toBe("completed");
      expect(completedSession.overallScore).toBe(Math.round((84 + 65) / 2));
      expect(completedSession.rubricSummary?.technicalAccuracy).toBe(Math.round((90 + 60) / 2));
      expect(completedSession.rubricSummary?.clarity).toBe(Math.round((80 + 70) / 2));

      // Flagged weak topic due to Q2 low technical accuracy (<70)
      expect(completedSession.weakTopics?.length).toBeGreaterThan(0);
      expect(completedSession.recommendedPractice?.length).toBeGreaterThan(0);
    });
  });

  describe("onApplicationMovedToInterview hook", () => {
    it("auto-generates prep pack and sends deduplicated notification", async () => {
      const mockApp = {
        _id: "app-int",
        userId: "user-1",
        jobId: "job-100",
        status: "INTERVIEW",
      } as unknown as IApplication;

      const mockJob = {
        _id: "job-100",
        title: "Frontend Architect",
        company: "Vercel",
        requiredSkills: ["Next.js", "React"],
        description: "Scale next-generation frontend frameworks.",
      } as unknown as IJob;

      vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(mockApp)));
      vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));

      vi.spyOn(service, "generatePrepPack").mockResolvedValue({
        _id: "pack-auto",
        jobId: "job-100",
        likelyQuestions: [],
      } as unknown as IInterviewPrepPack);

      vi.spyOn(notificationService, "sendNotification").mockResolvedValue({
        notification: { _id: "notif-int" } as never,
        isDuplicate: false,
        emailSent: false,
      });

      const res = await service.onApplicationMovedToInterview("user-1", "app-int");

      expect(res.prepPack._id).toBe("pack-auto");
      expect(res.notified).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "interview_scheduled",
          deduplicationKey: "interview_prep:app-int",
        })
      );
    });
  });
});
