import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IJobAnalysis extends Document {
  jobId: Types.ObjectId;
  userId?: Types.ObjectId;
  requiredSkills: string[];
  optionalSkills: string[];
  experience: string;
  education: string;
  responsibilities: string[];
  seniority: string;
  locationRequirements: string;
  remoteEligibility: boolean;
  salary: string;
  employmentType: string;
  certifications: string[];
  mandatoryEligibilityConditions: string[];
  inferredData: string[];
  rawExtraction?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const JobAnalysisSchema = new Schema<IJobAnalysis>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    requiredSkills: [{ type: String, trim: true }],
    optionalSkills: [{ type: String, trim: true }],
    experience: { type: String, default: "" },
    education: { type: String, default: "" },
    responsibilities: [{ type: String, trim: true }],
    seniority: { type: String, default: "" },
    locationRequirements: { type: String, default: "" },
    remoteEligibility: { type: Boolean, default: false },
    salary: { type: String, default: "" },
    employmentType: { type: String, default: "" },
    certifications: [{ type: String, trim: true }],
    mandatoryEligibilityConditions: [{ type: String, trim: true }],
    inferredData: [{ type: String, trim: true }],
    rawExtraction: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const JobAnalysis: Model<IJobAnalysis> =
  mongoose.models.JobAnalysis ||
  mongoose.model<IJobAnalysis>("JobAnalysis", JobAnalysisSchema);
