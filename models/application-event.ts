import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IApplicationEvent extends Document {
  applicationId: Types.ObjectId;
  userId: Types.ObjectId;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

const ApplicationEventSchema = new Schema<IApplicationEvent>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    reason: { type: String },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

export const ApplicationEvent: Model<IApplicationEvent> =
  mongoose.models.ApplicationEvent ||
  mongoose.model<IApplicationEvent>("ApplicationEvent", ApplicationEventSchema);
