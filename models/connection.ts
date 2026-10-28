import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IJobSourceConnection extends Document {
  userId: Types.ObjectId;
  providerName: string;
  isEnabled: boolean;
  capabilities: {
    discover: boolean;
    submit: boolean;
    prefill: boolean;
    tier: "AUTO_SUBMIT" | "PREFILL_ASSISTED" | "MANUAL";
  };
  authConfig?: Record<string, unknown>;
  lastSyncAt?: Date;
  statusMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSourceConnectionSchema = new Schema<IJobSourceConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    capabilities: {
      discover: { type: Boolean, default: false },
      submit: { type: Boolean, default: false },
      prefill: { type: Boolean, default: false },
      tier: {
        type: String,
        enum: ["AUTO_SUBMIT", "PREFILL_ASSISTED", "MANUAL"],
        default: "MANUAL",
      },
    },
    authConfig: {
      type: Schema.Types.Mixed,
      select: false,
    },
    lastSyncAt: { type: Date },
    statusMessage: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

JobSourceConnectionSchema.index(
  { userId: 1, providerName: 1 },
  { unique: true }
);

export const JobSourceConnection: Model<IJobSourceConnection> =
  mongoose.models.JobSourceConnection ||
  mongoose.model<IJobSourceConnection>(
    "JobSourceConnection",
    JobSourceConnectionSchema
  );
