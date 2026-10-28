import { Job as BullJob } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { AgentTask } from "@/models/agent-task";
import { Job } from "@/models/job";
import { UserPreference } from "@/models/preference";
import { jobMatchingService } from "@/services/job-matching.service";
import { notificationService } from "@/services/notification.service";

export interface MatchingJobPayload {
  userId: string;
  jobId: string;
  threshold?: number;
  taskId?: string;
}

/**
 * Processor for AI job qualification matching tasks.
 */
export async function processMatchingJob(job: BullJob<MatchingJobPayload>): Promise<{
  overallScore: number;
  recommendedAction: string;
  notified: boolean;
}> {
  await connectToDatabase();
  const { userId, jobId, threshold = 80, taskId } = job.data;

  if (taskId) {
    await AgentTask.findByIdAndUpdate(taskId, {
      status: "running",
      startedAt: new Date(),
    });
  }

  try {
    const jobRecord = await Job.findById(jobId);
    if (!jobRecord) {
      throw new Error(`Job listing ${jobId} not found.`);
    }

    const matchResult = await jobMatchingService.calculateMatch(userId, jobId);

    // Check user preference for threshold
    const pref = await UserPreference.findOne({ userId });
    const userThreshold = pref?.notificationPreferences?.highMatchThreshold || threshold;

    let notified = false;
    if (matchResult.overallScore >= userThreshold) {
      // Check if user has enabled high_match_found notification
      const isEnabled = pref?.notificationPreferences?.events?.high_match_found !== false;
      if (isEnabled) {
        await notificationService.sendNotification({
          userId,
          title: `High Match: ${jobRecord.title} at ${jobRecord.company}`,
          message: `Your verified profile achieved a ${matchResult.overallScore}% qualification match for this role. Recommended action: ${matchResult.recommendedAction}.`,
          eventType: "high_match_found",
          link: `/jobs/preview?id=${jobId}`,
          deduplicationKey: `high_match:${userId}:${jobId}`,
        });
        notified = true;
      }
    }

    if (taskId) {
      await AgentTask.findByIdAndUpdate(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: {
          overallScore: matchResult.overallScore,
          recommendedAction: matchResult.recommendedAction,
          notified,
        },
      });
    }

    return {
      overallScore: matchResult.overallScore,
      recommendedAction: matchResult.recommendedAction,
      notified,
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
