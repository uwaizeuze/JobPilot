import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInterviewPrepPack extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  likelyQuestions: Array<{
    category: "technical" | "behavioral" | "system_design" | "role_specific" | "culture";
    question: string;
    rationale: string;
  }>;
  starOutlines: Array<{
    question: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    verifiedExperienceReference?: string;
  }>;
  skillGaps: Array<{
    skill: string;
    studyPlan: string;
  }>;
  questionsForInterviewer: string[];
  checklist: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMockInterviewSession extends Document {
  userId: Types.ObjectId;
  jobId?: Types.ObjectId;
  interviewType: "technical" | "behavioral" | "system_design" | "mixed";
  difficulty: "junior" | "mid" | "senior" | "staff";
  durationMinutes: number;
  status: "in_progress" | "completed" | "paused" | "abandoned";
  overallScore?: number;
  rubricSummary?: {
    clarity: number;
    structure: number;
    technicalAccuracy: number;
    depth: number;
    relevance: number;
  };
  weakTopics: string[];
  recommendedPractice: string[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInterviewAnswer extends Document {
  sessionId: Types.ObjectId;
  questionNumber: number;
  questionText: string;
  answerText: string;
  feedback: {
    scores: {
      clarity: number;
      structure: number;
      technicalAccuracy: number;
      depth: number;
      relevance: number;
    };
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
    sampleAnswer: string;
  };
  createdAt: Date;
}

const InterviewPrepPackSchema = new Schema<IInterviewPrepPack>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    likelyQuestions: [
      {
        category: {
          type: String,
          enum: [
            "technical",
            "behavioral",
            "system_design",
            "role_specific",
            "culture",
          ],
          required: true,
        },
        question: { type: String, required: true },
        rationale: { type: String, default: "" },
      },
    ],
    starOutlines: [
      {
        question: { type: String, required: true },
        situation: { type: String, required: true },
        task: { type: String, required: true },
        action: { type: String, required: true },
        result: { type: String, required: true },
        verifiedExperienceReference: { type: String },
      },
    ],
    skillGaps: [
      {
        skill: { type: String, required: true },
        studyPlan: { type: String, required: true },
      },
    ],
    questionsForInterviewer: [{ type: String }],
    checklist: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

InterviewPrepPackSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const MockInterviewSessionSchema = new Schema<IMockInterviewSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
    },
    interviewType: {
      type: String,
      enum: ["technical", "behavioral", "system_design", "mixed"],
      default: "mixed",
    },
    difficulty: {
      type: String,
      enum: ["junior", "mid", "senior", "staff"],
      default: "mid",
    },
    durationMinutes: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ["in_progress", "completed", "paused", "abandoned"],
      default: "in_progress",
      index: true,
    },
    overallScore: { type: Number, min: 0, max: 100 },
    rubricSummary: {
      clarity: { type: Number, min: 0, max: 100 },
      structure: { type: Number, min: 0, max: 100 },
      technicalAccuracy: { type: Number, min: 0, max: 100 },
      depth: { type: Number, min: 0, max: 100 },
      relevance: { type: Number, min: 0, max: 100 },
    },
    weakTopics: [{ type: String }],
    recommendedPractice: [{ type: String }],
    summary: { type: String },
  },
  {
    timestamps: true,
  }
);

const InterviewAnswerSchema = new Schema<IInterviewAnswer>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "MockInterviewSession",
      required: true,
      index: true,
    },
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    answerText: { type: String, required: true },
    feedback: {
      scores: {
        clarity: { type: Number, required: true },
        structure: { type: Number, required: true },
        technicalAccuracy: { type: Number, required: true },
        depth: { type: Number, required: true },
        relevance: { type: Number, required: true },
      },
      totalScore: { type: Number, required: true },
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      sampleAnswer: { type: String, required: true },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const InterviewPrepPack: Model<IInterviewPrepPack> =
  mongoose.models.InterviewPrepPack ||
  mongoose.model<IInterviewPrepPack>(
    "InterviewPrepPack",
    InterviewPrepPackSchema
  );

export const MockInterviewSession: Model<IMockInterviewSession> =
  mongoose.models.MockInterviewSession ||
  mongoose.model<IMockInterviewSession>(
    "MockInterviewSession",
    MockInterviewSessionSchema
  );

export const InterviewAnswer: Model<IInterviewAnswer> =
  mongoose.models.InterviewAnswer ||
  mongoose.model<IInterviewAnswer>("InterviewAnswer", InterviewAnswerSchema);
