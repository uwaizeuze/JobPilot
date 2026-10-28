import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAgentTask extends Document {
  userId: Types.ObjectId;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentTaskSchema = new Schema<IAgentTask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskType: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    payload: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

AgentTaskSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

export const AgentTask: Model<IAgentTask> =
  mongoose.models.AgentTask ||
  mongoose.model<IAgentTask>("AgentTask", AgentTaskSchema);
