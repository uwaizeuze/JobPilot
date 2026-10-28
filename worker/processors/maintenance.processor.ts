import { Job as BullJob } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { Job } from "@/models/job";
import { JobSourceConnection } from "@/models/connection";
import { providerRegistry } from "@/providers/provider-registry";

export interface MaintenanceJobPayload {
  task: "revalidate_jobs" | "sync_sources";
  cutoffDays?: number;
}

/**
 * Processor for periodic maintenance tasks (job revalidation, source sync).
 */
export async function processMaintenanceJob(job: BullJob<MaintenanceJobPayload>): Promise<{
  task: string;
  affectedCount: number;
}> {
  await connectToDatabase();
  const { task, cutoffDays = 30 } = job.data;

  let affectedCount = 0;

  switch (task) {
    case "revalidate_jobs": {
      const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
      const res = await Job.updateMany(
        {
          jobStatus: "open",
          lastVerifiedDate: { $lte: cutoffDate },
        },
        {
          $set: { jobStatus: "expired" },
        }
      );
      affectedCount = res.modifiedCount;
      break;
    }

    case "sync_sources": {
      const connections = await JobSourceConnection.find({ isEnabled: true });
      for (const conn of connections) {
        const provider = providerRegistry.getProvider(conn.providerName);
        if (provider) {
          const isConfigured = await provider.isConfigured();
          if (!isConfigured && conn.isEnabled) {
            conn.isEnabled = false;
            conn.statusMessage = "Provider configuration or credentials expired.";
            await conn.save();
            affectedCount++;
          }
        }
      }
      break;
    }

    default:
      throw new Error(`Unknown maintenance task: ${task}`);
  }

  return {
    task,
    affectedCount,
  };
}
