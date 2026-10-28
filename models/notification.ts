import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  eventType: string;
  read: boolean;
  link?: string;
  deduplicationKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
    deduplicationKey: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index(
  { userId: 1, deduplicationKey: 1 },
  { unique: true, sparse: true }
);

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
