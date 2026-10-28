import { Job as BullJob } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { AgentTask } from "@/models/agent-task";
import { jobDiscoveryService } from "@/services/job-discovery.service";
import { enqueueMatchingJob } from "@/lib/queue/job-queue";

export interface DiscoveryJobPayload {
  userId: string;
  query?: string;
  location?: string;
  providers?: string[];
  autoMatch?: boolean;
  taskId?: string;
}

/**
 * Processor for background job discovery tasks.
 */
export async function processDiscoveryJob(job: BullJob<DiscoveryJobPayload>): Promise<{
  discoveredCount: number;
  providerSummary: Record<string, number>;
}> {
  await connectToDatabase();
  const { userId, query, location, providers, autoMatch, taskId } = job.data;

  if (taskId) {
    await AgentTask.findByIdAndUpdate(taskId, {
      status: "running",
      startedAt: new Date(),
    });
  }

  try {
    const result = await jobDiscoveryService.discoverJobs(userId, {
      query: query || "Software Engineer",
      location: location || "Remote",
      providers,
      limit: 25,
    });

    const discoveredCount = result.jobs.length;

    // Optional: queue matching for newly discovered jobs
    if (autoMatch && discoveredCount > 0) {
      for (const discoveredJob of result.jobs.slice(0, 5)) {
        await enqueueMatchingJob({
          userId,
          jobId: String(discoveredJob._id),
          threshold: 80,
        });
      }
    }

    if (taskId) {
      await AgentTask.findByIdAndUpdate(taskId, {
        status: "completed",
        completedAt: new Date(),
        result: {
          discoveredCount,
          providerSummary: result.summary,
        },
      });
    }

    return {
      discoveredCount,
      providerSummary: result.summary,
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
