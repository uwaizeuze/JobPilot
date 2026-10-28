import fs from "fs";
import path from "path";
import { Worker, WorkerOptions } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { getRedisClient, closeRedisConnection, isRedisConnected } from "@/lib/queue/redis";
import { QUEUE_NAMES, getQueue, closeAllQueues } from "@/lib/queue/job-queue";
import { processDiscoveryJob } from "./processors/discovery.processor";
import { processMatchingJob } from "./processors/matching.processor";
import { processNotificationJob } from "./processors/notification.processor";
import { processMaintenanceJob } from "./processors/maintenance.processor";
import { registerRepeatableSchedules } from "./schedules";

// Load .env.local if present in current directory
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
    } else {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.trim().match(/^([^=]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
        }
      }
    }
    break;
  }
}

const activeWorkers: Worker[] = [];
let isRunning = false;

/**
 * Starts all BullMQ workers and registers background schedules.
 */
export async function startWorkers(): Promise<boolean> {
  if (isRunning) return true;

  console.log("[Worker] Starting JobPilot background worker service...");

  // 1. Ensure DB connection
  try {
    await connectToDatabase();
    console.log("[Worker] Database connection established.");
  } catch (err) {
    console.warn(
      `[Worker] Database offline: ${err instanceof Error ? err.message : String(err)}. Proceeding in resilient mode.`
    );
  }

  // 2. Ensure Redis connection
  const isOnline = await isRedisConnected();
  if (!isOnline) {
    console.warn(
      "[Worker] Redis is not reachable. Worker cannot process queue jobs until Redis is connected. Tasks will remain in MongoDB queue."
    );
    return false;
  }

  const client = await getRedisClient();
  if (!client) {
    console.warn("[Worker] Could not acquire Redis client.");
    return false;
  }

  const workerConfig: WorkerOptions = {
    connection: client,
    limiter: {
      max: 20,
      duration: 1000,
    },
  };

  try {
    // 3. Initialize Discovery Worker
    const discoveryWorker = new Worker(
      QUEUE_NAMES.DISCOVERY,
      processDiscoveryJob,
      { ...workerConfig, concurrency: 3 }
    );

    // 4. Initialize Matching Worker
    const matchingWorker = new Worker(
      QUEUE_NAMES.MATCHING,
      processMatchingJob,
      { ...workerConfig, concurrency: 5 }
    );

    // 5. Initialize Notification Worker
    const notificationWorker = new Worker(
      QUEUE_NAMES.NOTIFICATIONS,
      processNotificationJob,
      { ...workerConfig, concurrency: 5 }
    );

    // 6. Initialize Maintenance Worker
    const maintenanceWorker = new Worker(
      QUEUE_NAMES.MAINTENANCE,
      processMaintenanceJob,
      { ...workerConfig, concurrency: 2 }
    );

    const workers = [discoveryWorker, matchingWorker, notificationWorker, maintenanceWorker];

    for (const w of workers) {
      w.on("completed", (job) => {
        console.log(`[Worker:${w.name}] Job ${job.id} completed successfully.`);
      });

      w.on("failed", (job, err) => {
        console.error(`[Worker:${w.name}] Job ${job?.id} failed: ${err.message}`);
      });

      w.on("error", (err) => {
        console.warn(`[Worker:${w.name}] Worker error: ${err.message}`);
      });

      activeWorkers.push(w);
    }

    // 7. Register repeatable cron schedules
    const [discQ, notifQ, maintQ] = await Promise.all([
      getQueue(QUEUE_NAMES.DISCOVERY),
      getQueue(QUEUE_NAMES.NOTIFICATIONS),
      getQueue(QUEUE_NAMES.MAINTENANCE),
    ]);

    await registerRepeatableSchedules({
      discovery: discQ,
      notifications: notifQ,
      maintenance: maintQ,
    });

    isRunning = true;
    console.log(`[Worker] All 4 BullMQ workers initialized and active across queues.`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Error starting workers: ${msg}`);
    await stopWorkers();
    return false;
  }
}

/**
 * Gracefully shuts down all active workers and queue connections.
 */
export async function stopWorkers(): Promise<void> {
  console.log("[Worker] Gracefully shutting down workers...");
  for (const w of activeWorkers) {
    try {
      await w.close();
    } catch (err) {
      console.warn(`[Worker] Error closing worker ${w.name}:`, err);
    }
  }
  activeWorkers.length = 0;
  await closeAllQueues();
  await closeRedisConnection();
  isRunning = false;
  console.log("[Worker] All workers and connections stopped.");
}

export function isWorkerRunning(): boolean {
  return isRunning;
}

// Handle termination signals for standalone execution
if (typeof process !== "undefined" && require.main === module) {
  startWorkers().catch((err) => {
    console.error("[Worker] Fatal startup error:", err);
    process.exit(1);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Initiating graceful shutdown...`);
    await stopWorkers();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}
