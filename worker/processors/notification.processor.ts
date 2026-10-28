import { Job as BullJob } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { AgentTask } from "@/models/agent-task";
import { Application } from "@/models/application";
import { IJob } from "@/models/job";
import { UserPreference } from "@/models/preference";
import { User } from "@/models/user";
import { notificationService } from "@/services/notification.service";

export interface NotificationJobPayload {
  userId: string;
  type: "email" | "follow_up_scan" | "interview_reminder_scan" | "daily_digest";
  recipientEmail?: string;
  subject?: string;
  content?: string;
  link?: string;
  deduplicationKey?: string;
  applicationId?: string;
  taskId?: string;
}

/**
 * Processor for notification queues (direct emails, follow-up scans, interview reminders, digests).
 */
export async function processNotificationJob(job: BullJob<NotificationJobPayload>): Promise<{
  processedType: string;
  dispatchedCount: number;
}> {
  await connectToDatabase();
  const { userId, type, recipientEmail, subject, content, link, deduplicationKey, taskId } = job.data;

  if (taskId) {
    await AgentTask.findByIdAndUpdate(taskId, {
      status: "running",
      startedAt: new Date(),
    });
  }

  let dispatchedCount = 0;

  try {
    switch (type) {
      case "email": {
        if (!recipientEmail || !subject || !content) {
          throw new Error("Missing required email fields (recipientEmail, subject, content).");
        }
        await notificationService.sendNotification({
          userId,
          title: subject,
          message: content,
          eventType: "daily_summary",
          link,
          recipientEmail,
          deduplicationKey,
        });
        dispatchedCount = 1;
        break;
      }

      case "follow_up_scan": {
        // Find applications in APPLIED status submitted > 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const pendingApps = await Application.find({
          userId,
          status: "APPLIED",
          updatedAt: { $lte: sevenDaysAgo },
        })
          .populate<{ jobId: IJob }>("jobId")
          .limit(20);

        for (const app of pendingApps) {
          const jobTitle = app.jobId?.title || "Role";
          const company = app.jobId?.company || "Company";
          const appDedupeKey = `follow_up_due:${app._id}`;
          const res = await notificationService.sendNotification({
            userId,
            title: `Follow-Up Recommended: ${jobTitle} at ${company}`,
            message: `It has been 7+ days since your application was submitted. Review the application tracker to send a follow-up or check status.`,
            eventType: "follow_up_due",
            link: "/tracker",
            deduplicationKey: appDedupeKey,
          });

          if (!res.isDuplicate) {
            dispatchedCount++;
          }
        }
        break;
      }

      case "interview_reminder_scan": {
        // Find upcoming interviews scheduled in the next 24 hours
        const now = new Date();
        const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const upcomingApps = await Application.find({
          userId,
          status: "INTERVIEW",
          interviewDate: { $gte: now, $lte: next24h },
        }).populate<{ jobId: IJob }>("jobId");

        for (const app of upcomingApps) {
          const jobTitle = app.jobId?.title || "Role";
          const company = app.jobId?.company || "Company";
          const roundKey = `interview_remind:${app._id}:${app.interviewDate?.toISOString().slice(0, 10)}`;
          const res = await notificationService.sendNotification({
            userId,
            title: `Upcoming Interview: ${jobTitle} at ${company}`,
            message: `You have an interview scheduled for ${app.interviewDate ? app.interviewDate.toLocaleDateString() : "tomorrow"}. Review your prep pack and practice with the mock interview room!`,
            eventType: "interview_scheduled",
            link: `/interviews/prep?jobId=${app.jobId?._id || app.jobId}`,
            deduplicationKey: roundKey,
          });

          if (!res.isDuplicate) {
            dispatchedCount++;
          }
        }
        break;
      }

      case "daily_digest": {
        // Daily digest summary of active applications and high match jobs
        const [user, pref, activeAppsCount] = await Promise.all([
          User.findById(userId),
          UserPreference.findOne({ userId }),
          Application.countDocuments({
            userId,
            status: { $in: ["DISCOVERED", "PREPARING", "READY_FOR_REVIEW", "SUBMITTING", "APPLIED", "INTERVIEW"] },
          }),
        ]);

        if (pref?.notificationPreferences?.dailyDigest) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const res = await notificationService.sendNotification({
            userId,
            title: `JobPilot Daily Briefing — ${todayStr}`,
            message: `You have ${activeAppsCount} active opportunities in your pipeline. Log in to review new matches and practice for scheduled interviews.`,
            eventType: "daily_summary",
            link: "/tracker",
            recipientEmail: user?.email,
            deduplicationKey: `digest:${userId}:${todayStr}`,
          });

          if (!res.isDuplicate) {
            dispatchedCount++;
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown notification job type: ${type}`);
    }

    if (taskId) {
      await AgentTask.findByIdAndUpdate(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: {
          processedType: type,
          dispatchedCount,
        },
      });
    }

    return {
      processedType: type,
      dispatchedCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (taskId) {
      const task = await AgentTask.findById(taskId);
      const newRetryCount = (task?.retryCount || 0) + 1;
      const isFinalAttempt = newRetryCount >= (task?.maxRetries || 3);

      await AgentTask.findByIdAndUpdate(taskId, {
        status: isFinalAttempt ? "failed" : "pending",
        retryCount: newRetryCount,
        error: errorMsg,
      });
    }

    throw err;
  }
}
