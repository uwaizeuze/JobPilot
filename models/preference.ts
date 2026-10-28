import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INotificationEventPreferences {
  high_match_found: boolean;
  resume_generated: boolean;
  application_ready_for_review: boolean;
  submitted: boolean;
  failed: boolean;
  interview_scheduled: boolean;
  follow_up_due: boolean;
  integration_disconnected: boolean;
  daily_summary: boolean;
}

export interface INotificationPreferences {
  inApp: boolean;
  email: boolean;
  dailyDigest: boolean;
  highMatchThreshold: number;
  events: INotificationEventPreferences;
}

export interface IUserPreference extends Document {
  userId: Types.ObjectId;
  monthlyTokenBudget: number;
  tokensUsedThisMonth: number;
  maxApplicationsPerDay: number;
  allowedModels: string[];
  consentPolicy: "auto" | "approve";
  globalPause: boolean;
  encryptedApiKey?: string;
  keyLastFour?: string;
  notificationPreferences?: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    monthlyTokenBudget: {
      type: Number,
      default: 200000,
      min: 1000,
    },
    tokensUsedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxApplicationsPerDay: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
    allowedModels: {
      type: [String],
      default: ["gpt-4o-mini", "gpt-4o"],
    },
    consentPolicy: {
      type: String,
      enum: ["auto", "approve"],
      default: "approve",
    },
    globalPause: {
      type: Boolean,
      default: false,
    },
    encryptedApiKey: {
      type: String,
      select: false, // Never return in default queries
    },
    keyLastFour: {
      type: String,
      default: "",
    },
    notificationPreferences: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      highMatchThreshold: { type: Number, default: 80, min: 50, max: 100 },
      events: {
        high_match_found: { type: Boolean, default: true },
        resume_generated: { type: Boolean, default: true },
        application_ready_for_review: { type: Boolean, default: true },
        submitted: { type: Boolean, default: true },
        failed: { type: Boolean, default: true },
        interview_scheduled: { type: Boolean, default: true },
        follow_up_due: { type: Boolean, default: true },
        integration_disconnected: { type: Boolean, default: true },
        daily_summary: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

export const UserPreference: Model<IUserPreference> =
  mongoose.models.UserPreference ||
  mongoose.model<IUserPreference>("UserPreference", UserPreferenceSchema);
