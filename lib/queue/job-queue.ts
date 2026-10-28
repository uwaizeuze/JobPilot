import { Queue, QueueOptions } from "bullmq";
import { connectToDatabase } from "@/lib/db";
import { AgentTask, IAgentTask } from "@/models/agent-task";
import { getRedisClient, isRedisConnected } from "./redis";

export const QUEUE_NAMES = {
  DISCOVERY: "jobpilot-discovery",
  MATCHING: "jobpilot-matching",
  NOTIFICATIONS: "jobpilot-notifications",
  MAINTENANCE: "jobpilot-maintenance",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface DiscoveryJobData {
  userId: string;
  query?: string;
  location?: string;
  providers?: string[];
  autoMatch?: boolean;
}

export interface MatchingJobData {
  userId: string;
  jobId: string;
  threshold?: number;
}

export interface NotificationJobData {
  userId: string;
  type: "email" | "follow_up_scan" | "interview_reminder_scan" | "daily_digest";
  recipientEmail?: string;
  subject?: string;
  content?: string;
  link?: string;
  deduplicationKey?: string;
  applicationId?: string;
}

export interface MaintenanceJobData {
  task: "revalidate_jobs" | "sync_sources";
  cutoffDays?: number;
}

export interface EnqueueResult {
  enqueued: boolean;
  jobId?: string;
  taskId?: string;
  queueName: string;
  offline: boolean;
  message?: string;
}

const activeQueues = new Map<string, Queue>();

/**
 * Initializes or returns an active BullMQ Queue instance for the specified queue name.
 */
export async function getQueue(queueName: QueueName): Promise<Queue | null> {
  const isOnline = await isRedisConnected();
  if (!isOnline) {
    return null;
  }

  if (activeQueues.has(queueName)) {
    return activeQueues.get(queueName)!;
  }

  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const queueOptions: QueueOptions = {
    connection: client,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
        age: 60 * 60 * 24, // 24 hours
      },
      removeOnFail: {
        count: 1000,
        age: 60 * 60 * 24 * 7, // 7 days
      },
    },
  };

  const queue = new Queue(queueName, queueOptions);
  activeQueues.set(queueName, queue);
  return queue;
}

/**
 * Helper to register an AgentTask in MongoDB and enqueue into BullMQ.
 * Gracefully marks task as pending in MongoDB if Redis is offline.
 */
async function enqueueWithTaskRecord<T extends Record<string, unknown>>(
  queueName: QueueName,
  jobName: string,
  data: T,
  userId?: string,
  idempotencyKey?: string
): Promise<EnqueueResult> {
  await connectToDatabase();

  let agentTask: IAgentTask | null = null;

  // 1. Create or retrieve AgentTask in MongoDB
  if (userId) {
    try {
      if (idempotencyKey) {
        agentTask = await AgentTask.findOne({ userId, idempotencyKey });
      }

      if (!agentTask) {
        agentTask = await AgentTask.create({
          userId,
          taskType: jobName,
          status: "pending",
          idempotencyKey,
          payload: data,
          maxRetries: 3,
          retryCount: 0,
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[Queue] Failed to record AgentTask:`, err);
      }
    }
  }

  // 2. Try enqueuing to BullMQ
  const queue = await getQueue(queueName);

  if (!queue) {
    return {
      enqueued: false,
      taskId: agentTask?._id ? String(agentTask._id) : undefined,
      queueName,
      offline: true,
      message: "Worker/Redis is offline; task recorded in database and queued for delayed processing.",
    };
  }

  try {
    const job = await queue.add(jobName, {
      ...data,
      taskId: agentTask?._id ? String(agentTask._id) : undefined,
    }, {
      jobId: idempotencyKey,
    });

    return {
      enqueued: true,
      jobId: job.id,
      taskId: agentTask?._id ? String(agentTask._id) : undefined,
      queueName,
      offline: false,
      message: "Job enqueued successfully to BullMQ.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      enqueued: false,
      taskId: agentTask?._id ? String(agentTask._id) : undefined,
      queueName,
      offline: true,
      message: `Failed to enqueue to BullMQ: ${msg}. Task saved in database.`,
    };
  }
}

/**
 * Enqueues a job discovery task.
 */
export async function enqueueDiscoveryJob(data: DiscoveryJobData): Promise<EnqueueResult> {
  const idempotencyKey = `disc:${data.userId}:${Date.now()}`;
  return enqueueWithTaskRecord(
    QUEUE_NAMES.DISCOVERY,
    "job_discovery",
    data as unknown as Record<string, unknown>,
    data.userId,
    idempotencyKey
  );
}

/**
 * Enqueues an AI job qualification matching task.
 */
export async function enqueueMatchingJob(data: MatchingJobData): Promise<EnqueueResult> {
  const idempotencyKey = `match:${data.userId}:${data.jobId}`;
  return enqueueWithTaskRecord(
    QUEUE_NAMES.MATCHING,
    "job_matching",
    data as unknown as Record<string, unknown>,
    data.userId,
    idempotencyKey
  );
}

/**
 * Enqueues a notification or reminder scan job.
 */
export async function enqueueNotificationJob(data: NotificationJobData): Promise<EnqueueResult> {
  const idempotencyKey = data.deduplicationKey || `notif:${data.userId}:${data.type}:${Date.now()}`;
  return enqueueWithTaskRecord(
    QUEUE_NAMES.NOTIFICATIONS,
    `notification_${data.type}`,
    data as unknown as Record<string, unknown>,
    data.userId,
    idempotencyKey
  );
}

/**
 * Enqueues a system maintenance job (revalidation, source sync).
 */
export async function enqueueMaintenanceJob(data: MaintenanceJobData): Promise<EnqueueResult> {
  const idempotencyKey = `maint:${data.task}:${new Date().toISOString().slice(0, 13)}`;
  return enqueueWithTaskRecord(
    QUEUE_NAMES.MAINTENANCE,
    data.task,
    data as unknown as Record<string, unknown>,
    undefined,
    idempotencyKey
  );
}

export interface QueueHealthStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

/**
 * Retrieves aggregate metrics across all BullMQ queues.
 */
export async function getQueueMetrics(): Promise<{
  isOnline: boolean;
  queues: QueueHealthStats[];
  totalWaiting: number;
  totalActive: number;
  totalFailed: number;
  totalCompleted: number;
}> {
  const isOnline = await isRedisConnected();
  if (!isOnline) {
    return {
      isOnline: false,
      queues: [],
      totalWaiting: 0,
      totalActive: 0,
      totalFailed: 0,
      totalCompleted: 0,
    };
  }

  const queueNames: QueueName[] = [
    QUEUE_NAMES.DISCOVERY,
    QUEUE_NAMES.MATCHING,
    QUEUE_NAMES.NOTIFICATIONS,
    QUEUE_NAMES.MAINTENANCE,
  ];

  const queuesStats: QueueHealthStats[] = [];
  let totalWaiting = 0;
  let totalActive = 0;
  let totalFailed = 0;
  let totalCompleted = 0;

  for (const name of queueNames) {
    try {
      const q = await getQueue(name);
      if (!q) continue;

      const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed");
      const isPaused = await q.isPaused();

      totalWaiting += counts.waiting || 0;
      totalActive += counts.active || 0;
      totalFailed += counts.failed || 0;
      totalCompleted += counts.completed || 0;

      queuesStats.push({
        queueName: name,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        isPaused,
      });
    } catch {
      // Continue inspecting other queues
    }
  }

  return {
    isOnline: true,
    queues: queuesStats,
    totalWaiting,
    totalActive,
    totalFailed,
    totalCompleted,
  };
}

/**
 * Closes all queue connections.
 */
export async function closeAllQueues(): Promise<void> {
  for (const [name, queue] of activeQueues.entries()) {
    try {
      await queue.close();
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[Queue] Error closing queue ${name}:`, err);
      }
    }
  }
  activeQueues.clear();
}
