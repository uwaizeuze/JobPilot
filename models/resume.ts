import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IResume extends Document {
  userId: Types.ObjectId;
  originalFileName: string;
  fileType: "pdf" | "docx";
  rawText: string;
  parsedData?: Record<string, unknown>;
  isMaster: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResumeVersion extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  resumeId: Types.ObjectId;
  versionNumber: number;
  tailoredContent: Record<string, unknown>;
  unsupportedClaimsDetected: string[];
  pdfStoragePath?: string;
  docxStoragePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "docx"], required: true },
    rawText: { type: String, required: true },
    parsedData: { type: Schema.Types.Mixed },
    isMaster: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const ResumeVersionSchema = new Schema<IResumeVersion>(
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
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    versionNumber: { type: Number, required: true, default: 1 },
    tailoredContent: { type: Schema.Types.Mixed, required: true },
    unsupportedClaimsDetected: [{ type: String }],
    pdfStoragePath: { type: String },
    docxStoragePath: { type: String },
  },
  {
    timestamps: true,
  }
);

ResumeVersionSchema.index({ userId: 1, jobId: 1, versionNumber: 1 });

export const Resume: Model<IResume> =
  mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);

export const ResumeVersion: Model<IResumeVersion> =
  mongoose.models.ResumeVersion ||
  mongoose.model<IResumeVersion>("ResumeVersion", ResumeVersionSchema);
