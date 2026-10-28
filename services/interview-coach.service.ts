import { z } from "zod";
import { openAIProvider } from "@/lib/ai";
import { decryptApiKey } from "@/lib/crypto";
import { connectToDatabase } from "@/lib/db";
import { Application } from "@/models/application";
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
import { notificationService } from "@/services/notification.service";

export const PrepPackGenerationSchema = z.object({
  likelyQuestions: z.array(
    z.object({
      category: z.enum([
        "technical",
        "behavioral",
        "system_design",
        "role_specific",
        "culture",
      ]),
      question: z.string(),
      rationale: z.string(),
    })
  ),
  starOutlines: z.array(
    z.object({
      question: z.string(),
      situation: z.string(),
      task: z.string(),
      action: z.string(),
      result: z.string(),
      verifiedExperienceReference: z.string().optional(),
    })
  ),
  skillGaps: z.array(
    z.object({
      skill: z.string(),
      studyPlan: z.string(),
    })
  ),
  questionsForInterviewer: z.array(z.string()),
  checklist: z.array(z.string()),
});

export const RubricEvaluationSchema = z.object({
  clarity: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
  technicalAccuracy: z.number().min(0).max(100),
  depth: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  sampleAnswer: z.string(),
  weakTopic: z.string().optional(),
  followUpQuestion: z.string().optional(),
});

export type RubricEvaluation = z.infer<typeof RubricEvaluationSchema>;

export interface StartMockInterviewOptions {
  jobId?: string;
  roleTitle?: string;
  interviewType: "technical" | "behavioral" | "system_design" | "mixed";
  difficulty: "junior" | "mid" | "senior" | "staff";
  durationMinutes?: number;
  totalQuestions?: number;
}

export interface AnswerSubmissionResult {
  answer: IInterviewAnswer;
  nextQuestion?: string;
  questionNumber: number;
  totalQuestions: number;
  isCompleted: boolean;
  sessionSummary?: {
    overallScore: number;
    rubricSummary: IMockInterviewSession["rubricSummary"];
    weakTopics: string[];
    recommendedPractice: string[];
    summary: string;
  };
}

export interface InterviewAnalyticsSummary {
  totalSessions: number;
  averageScore: number;
  completedSessions: number;
  scoreTrend: Array<{ date: string; score: number; type: string }>;
  rubricAverages: {
    clarity: number;
    structure: number;
    technicalAccuracy: number;
    depth: number;
    relevance: number;
  };
  weakTopics: string[];
  recommendedPractice: string[];
  sessions: IMockInterviewSession[];
}

export class InterviewCoachService {
  /**
   * Generates or retrieves an interview prep pack for a specific job.
   * Grounded strictly in the candidate's verified profile data.
   */
  async generatePrepPack(
    userId: string,
    jobId: string,
    forceRegenerate = false
  ): Promise<IInterviewPrepPack> {
    await connectToDatabase();

    const existing = await InterviewPrepPack.findOne({ userId, jobId });
    if (existing && !forceRegenerate) {
      return existing;
    }

    const [job, profile, analysis] = await Promise.all([
      Job.findById(jobId),
      ProfessionalProfile.findOne({ userId }),
      JobAnalysis.findOne({ jobId }),
    ]);

    if (!job) throw new Error(`Job listing with ID '${jobId}' not found.`);
    if (!profile) throw new Error("Professional profile not found. Complete profile before interview prep.");

    // Check user's AI credentials
    const preference = await UserPreference.findOne({ userId }).select("+encryptedApiKey");
    let userApiKey: string | undefined;
    if (preference?.encryptedApiKey) {
      try {
        userApiKey = decryptApiKey(preference.encryptedApiKey);
      } catch {
        // Fallback to server key or deterministic
      }
    }

    const isAIConfigured = openAIProvider.isConfigured(userApiKey);
    let packData: z.infer<typeof PrepPackGenerationSchema>;

    if (isAIConfigured && preference && preference.tokensUsedThisMonth < preference.monthlyTokenBudget) {
      try {
        const prompt = this.buildPrepPackPrompt(job, profile, analysis);
        const result = await openAIProvider.generateStructured({
          prompt,
          schema: PrepPackGenerationSchema,
          apiKey: userApiKey,
        });

        packData = result.data;
        if (result.tokensUsed > 0) {
          preference.tokensUsedThisMonth += result.tokensUsed;
          await preference.save();
        }
      } catch {
        packData = this.buildDeterministicPrepPack(job, profile, analysis);
      }
    } else {
      packData = this.buildDeterministicPrepPack(job, profile, analysis);
    }

    if (existing) {
      existing.likelyQuestions = packData.likelyQuestions;
      existing.starOutlines = packData.starOutlines;
      existing.skillGaps = packData.skillGaps;
      existing.questionsForInterviewer = packData.questionsForInterviewer;
      existing.checklist = packData.checklist;
      return existing.save();
    }

    return InterviewPrepPack.create({
      userId,
      jobId,
      ...packData,
    });
  }

  /**
   * Initializes a text-based mock interview session.
   */
  async startMockInterview(
    userId: string,
    options: StartMockInterviewOptions
  ): Promise<{ session: IMockInterviewSession; firstQuestion: string }> {
    await connectToDatabase();

    // Check budget limit
    const preference = await UserPreference.findOne({ userId });
    if (preference && preference.tokensUsedThisMonth >= preference.monthlyTokenBudget) {
      throw new Error(
        `Monthly token budget of ${preference.monthlyTokenBudget.toLocaleString()} tokens exceeded. You can adjust your budget in Settings > AI Agent.`
      );
    }

    let job: IJob | null = null;
    if (options.jobId) {
      job = await Job.findById(options.jobId);
    }

    const targetRole = job?.title || options.roleTitle || "Software Engineer";
    const session = await MockInterviewSession.create({
      userId,
      jobId: options.jobId,
      interviewType: options.interviewType,
      difficulty: options.difficulty,
      durationMinutes: options.durationMinutes || 30,
      status: "in_progress",
      weakTopics: [],
      recommendedPractice: [],
    });

    const firstQuestion = this.generateInitialQuestion(
      targetRole,
      options.interviewType,
      options.difficulty,
      job
    );

    return { session, firstQuestion };
  }

  /**
   * Evaluates a candidate's answer using a weighted rubric, records the answer,
   * and returns feedback plus the next question.
   */
  async submitAnswer(
    userId: string,
    sessionId: string,
    questionNumber: number,
    questionText: string,
    answerText: string,
    totalQuestions = 4
  ): Promise<AnswerSubmissionResult> {
    await connectToDatabase();

    const session = await MockInterviewSession.findOne({ _id: sessionId, userId });
    if (!session) throw new Error(`Interview session '${sessionId}' not found.`);
    if (session.status !== "in_progress") {
      throw new Error(`Cannot submit answer. Session is currently '${session.status}'.`);
    }

    const profile = await ProfessionalProfile.findOne({ userId });

    // AI or rubric evaluation
    const preference = await UserPreference.findOne({ userId }).select("+encryptedApiKey");
    let userApiKey: string | undefined;
    if (preference?.encryptedApiKey) {
      try {
        userApiKey = decryptApiKey(preference.encryptedApiKey);
      } catch {
        // Fallback
      }
    }

    const isAIConfigured = openAIProvider.isConfigured(userApiKey);
    let rubric: RubricEvaluation;

    if (isAIConfigured && preference && preference.tokensUsedThisMonth < preference.monthlyTokenBudget) {
      try {
        const prompt = `You are a senior technical interviewer evaluating a candidate's answer.
QUESTION: "${questionText}"
CANDIDATE ANSWER: "${answerText}"
CANDIDATE VERIFIED SKILLS: ${(profile?.technicalSkills || []).map((s) => s.name).join(", ")}

Evaluate against this exact rubric (0-100 for each):
- clarity: articulation, brevity, lack of filler words.
- structure: STAR format or logical flow (problem -> approach -> implementation -> outcome).
- technicalAccuracy: correctness of technical concepts and tooling.
- depth: consideration of tradeoffs, edge cases, failure scenarios, and scale.
- relevance: directly addressing the question asked.

Provide 2-3 concrete strengths, 2-3 constructive weaknesses, and an improved sample answer grounded in authentic engineering practices (never invent false personal experience). If a weak topic is identified, state it briefly.`;

        const result = await openAIProvider.generateStructured({
          prompt,
          schema: RubricEvaluationSchema,
          apiKey: userApiKey,
        });

        rubric = result.data;
        if (result.tokensUsed > 0) {
          preference.tokensUsedThisMonth += result.tokensUsed;
          await preference.save();
        }
      } catch {
        rubric = this.evaluateRubricDeterministically(questionText, answerText, profile);
      }
    } else {
      rubric = this.evaluateRubricDeterministically(questionText, answerText, profile);
    }

    // Deterministic rubric weighted total:
    // clarity 15%, structure 20%, technicalAccuracy 25%, depth 20%, relevance 20%
    const totalScore = Math.round(
      rubric.clarity * 0.15 +
        rubric.structure * 0.2 +
        rubric.technicalAccuracy * 0.25 +
        rubric.depth * 0.2 +
        rubric.relevance * 0.2
    );

    const savedAnswer = await InterviewAnswer.create({
      sessionId: session._id,
      questionNumber,
      questionText,
      answerText,
      feedback: {
        scores: {
          clarity: rubric.clarity,
          structure: rubric.structure,
          technicalAccuracy: rubric.technicalAccuracy,
          depth: rubric.depth,
          relevance: rubric.relevance,
        },
        totalScore,
        strengths: rubric.strengths,
        weaknesses: rubric.weaknesses,
        sampleAnswer: rubric.sampleAnswer,
      },
    });

    if (rubric.weakTopic && !session.weakTopics.includes(rubric.weakTopic)) {
      session.weakTopics.push(rubric.weakTopic);
      await session.save();
    }

    const isCompleted = questionNumber >= totalQuestions;
    let nextQuestion: string | undefined;

    if (!isCompleted) {
      nextQuestion =
        rubric.followUpQuestion ||
        this.generateFollowUpOrNextQuestion(
          session.interviewType,
          session.difficulty,
          questionNumber + 1,
          answerText
        );
    } else {
      // Finalize session
      const summaryResult = await this.endSession(userId, sessionId, "completed");
      return {
        answer: savedAnswer,
        questionNumber,
        totalQuestions,
        isCompleted: true,
        sessionSummary: {
          overallScore: summaryResult.overallScore || totalScore,
          rubricSummary: summaryResult.rubricSummary,
          weakTopics: summaryResult.weakTopics,
          recommendedPractice: summaryResult.recommendedPractice,
          summary: summaryResult.summary || "Session completed successfully.",
        },
      };
    }

    return {
      answer: savedAnswer,
      nextQuestion,
      questionNumber,
      totalQuestions,
      isCompleted: false,
    };
  }

  /**
   * Finalizes and summarizes a mock interview session.
   */
  async endSession(
    userId: string,
    sessionId: string,
    status: "completed" | "paused" | "abandoned" = "completed"
  ): Promise<IMockInterviewSession> {
    await connectToDatabase();

    const session = await MockInterviewSession.findOne({ _id: sessionId, userId });
    if (!session) throw new Error(`Interview session '${sessionId}' not found.`);

    const answers = await InterviewAnswer.find({ sessionId: session._id }).sort({
      questionNumber: 1,
    });

    if (answers.length === 0) {
      session.status = status;
      session.overallScore = 0;
      session.summary = "No questions were answered during this session.";
      return session.save();
    }

    let clarityTotal = 0;
    let structureTotal = 0;
    let technicalAccuracyTotal = 0;
    let depthTotal = 0;
    let relevanceTotal = 0;
    let overallScoreSum = 0;
    const weakTopicsSet = new Set<string>(session.weakTopics || []);

    for (const ans of answers) {
      const s = ans.feedback.scores;
      clarityTotal += s.clarity;
      structureTotal += s.structure;
      technicalAccuracyTotal += s.technicalAccuracy;
      depthTotal += s.depth;
      relevanceTotal += s.relevance;
      overallScoreSum += ans.feedback.totalScore;

      // Extract low-scoring topics
      if (s.technicalAccuracy < 70) {
        weakTopicsSet.add(`Technical depth: ${ans.questionText.slice(0, 40)}...`);
      }
      if (s.structure < 70) {
        weakTopicsSet.add("STAR framework & narrative conciseness");
      }
    }

    const n = answers.length;
    const rubricSummary = {
      clarity: Math.round(clarityTotal / n),
      structure: Math.round(structureTotal / n),
      technicalAccuracy: Math.round(technicalAccuracyTotal / n),
      depth: Math.round(depthTotal / n),
      relevance: Math.round(relevanceTotal / n),
    };

    const overallScore = Math.round(overallScoreSum / n);
    const weakTopics = Array.from(weakTopicsSet);
    const recommendedPractice = this.generatePracticeRecommendations(
      rubricSummary,
      weakTopics
    );

    const summary = `Candidate completed ${n} question${n > 1 ? "s" : ""} with an overall score of ${overallScore}%. Top competency observed in ${
      rubricSummary.technicalAccuracy >= 80 ? "technical accuracy" : "articulation"
    }, with potential improvement in ${
      rubricSummary.structure < 75 ? "answer structure and STAR alignment" : "edge-case depth"
    }.`;

    session.status = status;
    session.overallScore = overallScore;
    session.rubricSummary = rubricSummary;
    session.weakTopics = weakTopics;
    session.recommendedPractice = recommendedPractice;
    session.summary = summary;

    return session.save();
  }

  /**
   * Deletes a mock session and its private answer transcripts.
   */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    await connectToDatabase();
    const session = await MockInterviewSession.findOne({ _id: sessionId, userId });
    if (!session) return false;

    await Promise.all([
      InterviewAnswer.deleteMany({ sessionId: session._id }),
      MockInterviewSession.deleteOne({ _id: session._id }),
    ]);

    return true;
  }

  /**
   * Returns complete interview history and aggregated score trends.
   */
  async getAnalytics(userId: string): Promise<InterviewAnalyticsSummary> {
    await connectToDatabase();

    const sessions = await MockInterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const completed = sessions.filter((s) => s.status === "completed" && s.overallScore != null);
    const totalSessions = sessions.length;
    const completedSessions = completed.length;

    const averageScore =
      completedSessions > 0
        ? Math.round(
            completed.reduce((acc, s) => acc + (s.overallScore || 0), 0) / completedSessions
          )
        : 0;

    const scoreTrend = completed
      .slice(0, 15)
      .reverse()
      .map((s) => ({
        date: new Date(s.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.overallScore || 0,
        type: s.interviewType,
      }));

    let cSum = 0,
      sSum = 0,
      tSum = 0,
      dSum = 0,
      rSum = 0;
    const weakTopicsSet = new Set<string>();

    for (const s of completed) {
      if (s.rubricSummary) {
        cSum += s.rubricSummary.clarity;
        sSum += s.rubricSummary.structure;
        tSum += s.rubricSummary.technicalAccuracy;
        dSum += s.rubricSummary.depth;
        rSum += s.rubricSummary.relevance;
      }
      for (const w of s.weakTopics || []) {
        weakTopicsSet.add(w);
      }
    }

    const n = completedSessions || 1;
    const rubricAverages = {
      clarity: Math.round(cSum / n),
      structure: Math.round(sSum / n),
      technicalAccuracy: Math.round(tSum / n),
      depth: Math.round(dSum / n),
      relevance: Math.round(rSum / n),
    };

    const weakTopics = Array.from(weakTopicsSet);
    const recommendedPractice = this.generatePracticeRecommendations(rubricAverages, weakTopics);

    return {
      totalSessions,
      averageScore,
      completedSessions,
      scoreTrend,
      rubricAverages,
      weakTopics,
      recommendedPractice,
      sessions,
    };
  }

  /**
   * Hook triggered when an application advances to INTERVIEW status.
   * Auto-generates a prep pack and schedules a reminder notification idempotently.
   */
  async onApplicationMovedToInterview(
    userId: string,
    applicationId: string
  ): Promise<{ prepPack: IInterviewPrepPack; notified: boolean }> {
    await connectToDatabase();

    const application = await Application.findOne({ _id: applicationId, userId });
    if (!application) throw new Error(`Application '${applicationId}' not found.`);

    const job = await Job.findById(application.jobId);
    if (!job) throw new Error("Job not found.");

    // Auto-generate prep pack (idempotent)
    const prepPack = await this.generatePrepPack(userId, String(job._id));

    // Send deduplicated notification
    const notifResult = await notificationService.sendNotification({
      userId,
      title: `Interview Scheduled: ${job.company}`,
      message: `Your application for ${job.title} at ${job.company} is in interview stage. We prepared a tailored Prep Pack for your interview practice.`,
      eventType: "interview_scheduled",
      link: `/interviews/prep?jobId=${job._id}`,
      deduplicationKey: `interview_prep:${application._id}`,
    });

    return {
      prepPack,
      notified: !notifResult.isDuplicate,
    };
  }

  // ================= PRIVATE HELPERS =================

  private buildPrepPackPrompt(
    job: IJob,
    profile: IProfessionalProfile,
    analysis?: unknown
  ): string {
    const verifiedSkills = (profile.technicalSkills || []).map((s) => s.name).join(", ");
    const verifiedHistory = (profile.employmentHistory || [])
      .map(
        (e) =>
          `- ${e.title} at ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate}): ${(
            e.achievements || []
          ).join("; ")}`
      )
      .join("\n");

    const responsibilities =
      analysis && typeof analysis === "object" && "responsibilities" in analysis && Array.isArray((analysis as { responsibilities: string[] }).responsibilities)
        ? (analysis as { responsibilities: string[] }).responsibilities.slice(0, 3).join("; ")
        : "";

    return `Generate a comprehensive interview prep pack for this target job.
CRITICAL CONSTRAINT: You MUST build STAR outlines strictly using verified achievements from the candidate's profile. NEVER invent companies, metrics, or technologies not present in the candidate profile. If the candidate has no direct experience with a question requirement, explicitly state that and provide advice on answering honestly.

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Required Skills: ${job.requiredSkills.join(", ")}
Responsibilities: ${responsibilities || "Standard engineering responsibilities"}
Description: ${job.description.slice(0, 2500)}

CANDIDATE PROFILE:
Verified Skills: ${verifiedSkills}
Verified Employment:
${verifiedHistory || "No direct employment history logged."}

Generate structured JSON matching the schema:
1. likelyQuestions: 5 questions covering categories technical, behavioral, system_design, role_specific, culture.
2. starOutlines: 3 STAR outlines mapped to verified experiences.
3. skillGaps: Identify real gaps between job requirements and candidate profile with actionable study plans.
4. questionsForInterviewer: 4 thoughtful questions candidate can ask the hiring manager.
5. checklist: 4 logistical and tactical day-of checklist items.`;
  }

  public buildDeterministicPrepPack(
    job: IJob,
    profile: IProfessionalProfile,
    analysis?: unknown
  ): z.infer<typeof PrepPackGenerationSchema> {
    const candidateSkills = new Set(
      (profile.technicalSkills || []).map((s) => s.name.toLowerCase())
    );
    const missingSkills = (job.requiredSkills || []).filter(
      (s) => !candidateSkills.has(s.toLowerCase())
    );

    const responsibilities =
      analysis && typeof analysis === "object" && "responsibilities" in analysis && Array.isArray((analysis as { responsibilities: string[] }).responsibilities)
        ? (analysis as { responsibilities: string[] }).responsibilities
        : [];

    const firstRole = (profile.employmentHistory || [])[0];
    const topAchievement = firstRole?.achievements?.[0] || "delivered full-stack production services";

    const starOutlines = [
      {
        question: `Can you describe a high-impact technical project you led in your role?`,
        situation: firstRole
          ? `While working as ${firstRole.title} at ${firstRole.company}`
          : "During core production software engineering initiatives",
        task: "Delivering reliable system improvements within strict business constraints",
        action: `Implemented modern architectural standards and verified technical implementations (${topAchievement})`,
        result: "Maintained system availability, met sprint milestones, and improved team throughput.",
        verifiedExperienceReference: firstRole
          ? `${firstRole.title} at ${firstRole.company}`
          : "Verified Engineering Background",
      },
    ];

    if (missingSkills.length > 0) {
      starOutlines.push({
        question: `How do you approach working with ${missingSkills[0]} when you haven't used it extensively in production?`,
        situation: `Addressing technical requirements for ${missingSkills[0]}`,
        task: `Bridging qualifications honestly without pretending production experience`,
        action: `Leverage transferable experience in ${
          (profile.technicalSkills || [])[0]?.name || "core engineering"
        }, study official architecture guides, and build proof-of-concept prototypes`,
        result: `Demonstrated technical learning agility and honest, transparent engineering values.`,
        verifiedExperienceReference: "Honest Qualification Bridge",
      });
    }

    const skillGaps = (missingSkills.slice(0, 3).length > 0
      ? missingSkills.slice(0, 3)
      : ["Advanced System Architecture"]
    ).map((skill) => ({
      skill,
      studyPlan: `Review official documentation, design patterns, and implement an end-to-end sandbox application demonstrating ${skill}.`,
    }));

    return {
      likelyQuestions: [
        {
          category: "technical",
          question: `How do you structure and optimize performance in ${
            (job.requiredSkills || [])[0] || "modern distributed systems"
          }?`,
          rationale: `Core technical evaluation directly linked to target role requirements.`,
        },
        {
          category: "behavioral",
          question: `Describe a situation where a production deadline conflicted with architectural refactoring. How did you resolve it?`,
          rationale: `Assesses engineering prioritization and stakeholder communication.`,
        },
        {
          category: "system_design",
          question: `How would you design a fault-tolerant, scalable processing pipeline for ${job.company}'s core domain?`,
          rationale: `Evaluates scalability intuition, boundary limits, and database selection.`,
        },
        {
          category: "role_specific",
          question: responsibilities[0]
            ? `How would you take ownership of ${responsibilities[0].toLowerCase()} in your first quarter?`
            : `What considerations do you prioritize when onboarding into a ${job.title} role?`,
          rationale: `Tests technical velocity and team collaboration on core requirements.`,
        },
        {
          category: "culture",
          question: `What engineering practices do you advocate for when collaborating with product and cross-functional partners?`,
          rationale: `Assesses cultural alignment and cross-functional empathy.`,
        },
      ],
      starOutlines,
      skillGaps,
      questionsForInterviewer: [
        `What does success look like in this ${job.title} role over the first 90 days?`,
        `How does the team balance immediate roadmap commitments against long-term technical debt reduction?`,
        `What are the most challenging technical bottlenecks currently facing the engineering organization?`,
        `Can you share how code review and engineering RFC processes are practiced on the team?`,
      ],
      checklist: [
        "Review target company engineering blog, tech stack, and recent product announcements.",
        "Verify camera, microphone, and quiet room setup 15 minutes before the scheduled time.",
        "Have clean links ready for verified portfolio, GitHub repositories, and tailored resume.",
        "Prepare 3 concrete STAR engineering stories highlighting verified metrics and challenges.",
      ],
    };
  }

  private generateInitialQuestion(
    roleTitle: string,
    type: string,
    difficulty: string,
    job?: IJob | null
  ): string {
    const skill = (job?.requiredSkills || [])[0] || "distributed architectures";
    switch (type) {
      case "technical":
        return difficulty === "senior" || difficulty === "staff"
          ? `Welcome! For this ${roleTitle} technical session: How would you architect a zero-downtime database migration for a high-write service utilizing ${skill}? Walk me through your concurrency, validation, and rollback strategies.`
          : `Welcome! Let's begin the technical assessment for ${roleTitle}: Can you explain how you handle state management, asynchronous side-effects, and error boundaries in ${skill}?`;
      case "behavioral":
        return `Hello! Let's start with a foundational behavioral question: Can you describe a significant technical disagreement you had with a teammate or lead, what technical tradeoffs were at stake, and how you reached alignment?`;
      case "system_design":
        return `Welcome to the system design round for ${roleTitle}: How would you design a distributed rate limiter supporting millions of requests per second across multi-region deployments with minimal latency overhead?`;
      case "mixed":
      default:
        return `Welcome to your mock interview for ${roleTitle}! Let's start with a brief overview: Can you introduce your engineering background, highlight a challenging production system you built, and explain why you're interested in roles like ${roleTitle}?`;
    }
  }

  private generateFollowUpOrNextQuestion(
    type: string,
    difficulty: string,
    qNumber: number,
    previousAnswer: string
  ): string {
    const isShort = previousAnswer.trim().split(/\s+/).length < 50;

    if (qNumber === 2) {
      if (isShort) {
        return `Following up on that: Could you elaborate on the specific engineering tradeoffs you evaluated, and what metrics you used to measure the outcome?`;
      }
      return type === "behavioral"
        ? `Great context. Now, tell me about a time when a production release caused an unexpected outage or regression. What was your immediate response and how did you prevent recurrence?`
        : `Building on your response: How would you monitor, profile, and troubleshoot bottlenecks when this implementation is subjected to sudden 10x traffic spikes?`;
    }

    if (qNumber === 3) {
      return type === "system_design" || difficulty === "senior"
        ? `Let's discuss failure modes: What happens if network partitions occur between primary and replica nodes? How does your design preserve data consistency vs availability?`
        : `Can you walk me through your automated testing strategy for this component, from unit tests and contract mocks to end-to-end integration verification?`;
    }

    return `To conclude our session: What is one architectural or tooling decision in this domain that you initially favored but later reconsidered after seeing it in production?`;
  }

  private evaluateRubricDeterministically(
    questionText: string,
    answerText: string,
    profile?: IProfessionalProfile | null
  ): RubricEvaluation {
    const words = answerText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Check for structured indicators (STAR)
    const lower = answerText.toLowerCase();
    const starMatches = [
      "situation",
      "task",
      "action",
      "result",
      "challenge",
      "outcome",
      "metric",
      "reduced",
      "improved",
      "designed",
      "architected",
      "shipped",
      "implemented",
    ].filter((w) => lower.includes(w)).length;

    // Check verified skills presence
    const verifiedSkills = (profile?.technicalSkills || []).map((s) => s.name.toLowerCase());
    const skillMatches = verifiedSkills.filter((s) => lower.includes(s)).length;

    // Determine rubric components
    const clarity = Math.min(100, Math.max(50, wordCount > 20 && wordCount < 300 ? 85 : 65));
    const structure = Math.min(100, Math.max(45, 60 + starMatches * 8));
    const technicalAccuracy = Math.min(
      100,
      Math.max(50, 65 + Math.min(30, skillMatches * 10) + (wordCount > 60 ? 10 : 0))
    );
    const depth = Math.min(100, Math.max(40, 50 + Math.min(45, Math.floor(wordCount / 4))));
    const relevance = Math.min(100, Math.max(60, wordCount > 15 ? 85 : 55));

    const strengths: string[] = [];
    if (wordCount >= 50) strengths.push("Provided concrete context rather than generic high-level statements.");
    if (starMatches >= 2) strengths.push("Followed a structured narrative addressing problem, action, and outcome.");
    if (skillMatches > 0) strengths.push("Effectively referenced relevant engineering tools and frameworks.");
    if (strengths.length === 0) strengths.push("Promptly addressed the core question asked.");

    const weaknesses: string[] = [];
    if (wordCount < 40) weaknesses.push("Answer was quite concise; consider expanding on technical tradeoffs.");
    if (starMatches < 2) weaknesses.push("Could benefit from tighter STAR alignment (explicit Action and Result).");
    if (!lower.includes("metric") && !lower.includes("%") && !lower.includes("ms")) {
      weaknesses.push("Missing quantifiable impact or measurable performance indicators.");
    }

    return {
      clarity,
      structure,
      technicalAccuracy,
      depth,
      relevance,
      strengths,
      weaknesses,
      sampleAnswer: `A comprehensive answer would detail: 1) The exact architectural context and constraints, 2) The specific tooling selected (e.g. ${
        verifiedSkills[0] || "modern frameworks"
      }) and why alternatives were disqualified, 3) The implementation hurdles encountered, and 4) Concrete verification metrics (e.g. latency reduction, test coverage, team velocity).`,
      weakTopic: depth < 70 ? "Technical tradeoff depth" : undefined,
    };
  }

  private generatePracticeRecommendations(
    rubricSummary: { clarity: number; structure: number; technicalAccuracy: number; depth: number; relevance: number },
    weakTopics: string[]
  ): string[] {
    const list: string[] = [];

    if (rubricSummary.structure < 75) {
      list.push("Practice articulating answers strictly in STAR format: spend 20% on context, 60% on action, 20% on results.");
    }
    if (rubricSummary.depth < 75) {
      list.push("Deepen system design discussions by proactively addressing concurrency, failure modes, and database bottlenecks.");
    }
    if (rubricSummary.technicalAccuracy < 75) {
      list.push("Review fundamental computer science concepts, memory models, and core runtime behavior in your primary languages.");
    }
    if (rubricSummary.clarity < 75) {
      list.push("Focus on conciseness: aim to deliver your primary insight in the first 30 seconds before elaborating on details.");
    }

    for (const w of weakTopics.slice(0, 2)) {
      list.push(`Targeted drill: Focus study sessions on ${w}.`);
    }

    if (list.length === 0) {
      list.push("Perform timed mock sessions across higher difficulty levels to test resilience under pressure.");
    }

    return list;
  }
}

export const interviewCoachService = new InterviewCoachService();
