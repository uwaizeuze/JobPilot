import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const APPLICATION_STATES = [
  "DISCOVERED",
  "ANALYZING",
  "NOT_QUALIFIED",
  "SHORTLISTED",
  "PREPARING",
  "READY_FOR_REVIEW",
  "AWAITING_APPROVAL",
  "SUBMITTING",
  "APPLIED",
  "FAILED",
  "REJECTED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "WITHDRAWN",
  "CANCELLED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATES)[number];

export interface IApplication extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  resumeVersionId?: Types.ObjectId;
  coverLetterId?: Types.ObjectId;
  status: ApplicationStatus;
  statusReason?: string;
  notes?: string;
  recruiterContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  interviewDate?: Date;
  followUpDate?: Date;
  appliedDate?: Date;
  confirmationReference?: string;
  submissionMethod: "auto" | "prefill" | "manual";
  duplicateChecked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
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
    resumeVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeVersion",
    },
    coverLetterId: {
      type: Schema.Types.ObjectId,
      ref: "CoverLetter",
    },
    status: {
      type: String,
      enum: APPLICATION_STATES,
      default: "DISCOVERED",
      index: true,
    },
    statusReason: { type: String, default: "" },
    notes: { type: String, default: "" },
    recruiterContact: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    interviewDate: { type: Date },
    followUpDate: { type: Date },
    appliedDate: { type: Date },
    confirmationReference: { type: String },
    submissionMethod: {
      type: String,
      enum: ["auto", "prefill", "manual"],
      default: "manual",
    },
    duplicateChecked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

ApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);
