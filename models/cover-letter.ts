import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICoverLetter extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  resumeVersionId?: Types.ObjectId;
  content: string;
  tone: "professional" | "enthusiastic" | "concise" | "custom";
  createdAt: Date;
  updatedAt: Date;
}

const CoverLetterSchema = new Schema<ICoverLetter>(
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
    content: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      enum: ["professional", "enthusiastic", "concise", "custom"],
      default: "professional",
    },
  },
  {
    timestamps: true,
  }
);

export const CoverLetter: Model<ICoverLetter> =
  mongoose.models.CoverLetter ||
  mongoose.model<ICoverLetter>("CoverLetter", CoverLetterSchema);
