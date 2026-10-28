import { connectToDatabase } from "@/lib/db";
import { Notification, type INotification } from "@/models/notification";

export type NotificationEventType =
  | "high_match_found"
  | "resume_generated"
  | "application_ready_for_review"
  | "submitted"
  | "failed"
  | "interview_scheduled"
  | "follow_up_due"
  | "integration_disconnected"
  | "daily_summary";

export interface SendNotificationInput {
  userId: string;
  title: string;
  message: string;
  eventType: NotificationEventType;
  link?: string;
  deduplicationKey?: string;
  recipientEmail?: string;
}

export interface NotificationResult {
  notification: INotification;
  isDuplicate: boolean;
  emailSent: boolean;
}

export class NotificationService {
  /**
   * Dispatches a deduplicated notification to in-app notification center and optional email.
   * Section 13: "no repeated notifications for the same event, idempotency keys, retry-safe processing".
   */
  async sendNotification(input: SendNotificationInput): Promise<NotificationResult> {
    await connectToDatabase();

    // 1. Deduplication check
    if (input.deduplicationKey) {
      const existing = await Notification.findOne({
        userId: input.userId,
        deduplicationKey: input.deduplicationKey,
      });

      if (existing) {
        return {
          notification: existing,
          isDuplicate: true,
          emailSent: false,
        };
      }
    }

    // 2. Persist in-app notification
    const notification = await Notification.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      eventType: input.eventType,
      link: input.link,
      deduplicationKey: input.deduplicationKey,
      read: false,
    });

    // 3. Optional email dispatch if Resend/SMTP is configured
    let emailSent = false;
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "JobPilot <notifications@jobpilot.app>";

    if (resendApiKey && input.recipientEmail) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [input.recipientEmail],
            subject: input.title,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                <h2 style="color: #2563eb;">${input.title}</h2>
                <p style="font-size: 16px; line-height: 1.5;">${input.message}</p>
                ${
                  input.link
                    ? `<p style="margin-top: 24px;"><a href="${input.link}" style="background-color: #2563eb; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Details</a></p>`
                    : ""
                }
                <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
                <p style="font-size: 12px; color: #6b7280;">JobPilot Autonomous Assistant &bull; Candidate Notification</p>
              </div>
            `,
          }),
        });

        emailSent = response.ok;
      } catch (err) {
        console.warn(
          "[NotificationService] Email delivery warning (non-fatal):",
          err instanceof Error ? err.message : err
        );
      }
    }

    return {
      notification,
      isDuplicate: false,
      emailSent,
    };
  }

  /**
   * Retrieves notifications for a candidate
   */
  async getUserNotifications(
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<INotification[]> {
    await connectToDatabase();
    const filter: Record<string, unknown> = { userId };
    if (options?.unreadOnly) {
      filter.read = false;
    }

    return Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(options?.limit ?? 50)
      .exec();
  }

  /**
   * Marks a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    await connectToDatabase();
    const res = await Notification.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true } }
    );
    return res.modifiedCount > 0;
  }
}

export const notificationService = new NotificationService();
