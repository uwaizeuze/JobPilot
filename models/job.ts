import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IJob extends Document {
  userId?: Types.ObjectId;
  title: string;
  company: string;
  companyWebsite?: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience?: number;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  employmentType: "full-time" | "part-time" | "contract" | "internship";
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
  sourcePlatform: string;
  originalUrl: string;
  dateDiscovered: Date;
  postingDate?: Date;
  lastVerifiedDate: Date;
  applicationMethod: "auto" | "prefill" | "manual";
  jobStatus: "open" | "closed" | "expired";
  matchScore?: number;
  duplicateGroupId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true, index: true },
    companyWebsite: { type: String, trim: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String, trim: true }],
    preferredSkills: [{ type: String, trim: true }],
    requiredExperience: { type: Number, min: 0 },
    location: { type: String, required: true, trim: true },
    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "remote",
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      default: "full-time",
    },
    salaryRange: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: "USD" },
    },
    sourcePlatform: { type: String, required: true, trim: true, index: true },
    originalUrl: { type: String, required: true, trim: true },
    dateDiscovered: { type: Date, default: Date.now, index: true },
    postingDate: { type: Date },
    lastVerifiedDate: { type: Date, default: Date.now },
    applicationMethod: {
      type: String,
      enum: ["auto", "prefill", "manual"],
      default: "manual",
    },
    jobStatus: {
      type: String,
      enum: ["open", "closed", "expired"],
      default: "open",
      index: true,
    },
    matchScore: { type: Number, min: 0, max: 100 },
    duplicateGroupId: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ originalUrl: 1, userId: 1 }, { unique: false });

export const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
