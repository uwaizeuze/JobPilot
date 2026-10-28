import { Queue } from "bullmq";

export interface ScheduledTaskDef {
  name: string;
  queue: "jobpilot-discovery" | "jobpilot-notifications" | "jobpilot-maintenance";
  cron: string;
  description: string;
  defaultData: Record<string, unknown>;
}

export const REPEATABLE_SCHEDULES: ScheduledTaskDef[] = [
  {
    name: "daily_discovery",
    queue: "jobpilot-discovery",
    cron: "0 8 * * *", // 8:00 AM daily
    description: "Daily automated job discovery across permitted providers",
    defaultData: { query: "Software Engineer", location: "Remote", autoMatch: true },
  },
  {
    name: "notification_follow_up_scan",
    queue: "jobpilot-notifications",
    cron: "0 */6 * * *", // Every 6 hours
    description: "Scan for applications submitted > 7 days ago awaiting recruiter response",
    defaultData: { type: "follow_up_scan" },
  },
  {
    name: "notification_interview_reminder_scan",
    queue: "jobpilot-notifications",
    cron: "0 */2 * * *", // Every 2 hours
    description: "Scan for upcoming interview rounds within the next 24 hours",
    defaultData: { type: "interview_reminder_scan" },
  },
  {
    name: "notification_daily_digest",
    queue: "jobpilot-notifications",
    cron: "0 9 * * *", // 9:00 AM daily
    description: "Daily summary digest of active pipeline opportunities and interview prep",
    defaultData: { type: "daily_digest" },
  },
  {
    name: "maintenance_revalidate_jobs",
    queue: "jobpilot-maintenance",
    cron: "0 3 * * *", // 3:00 AM daily
    description: "Revalidate older job listings and expire stale postings",
    defaultData: { task: "revalidate_jobs", cutoffDays: 30 },
  },
];

/**
 * Registers all repeatable schedules on active BullMQ queues.
 */
export async function registerRepeatableSchedules(queues: {
  discovery?: Queue | null;
  notifications?: Queue | null;
  maintenance?: Queue | null;
}): Promise<void> {
  for (const schedule of REPEATABLE_SCHEDULES) {
    try {
      let targetQueue: Queue | null | undefined = null;

      if (schedule.queue === "jobpilot-discovery") targetQueue = queues.discovery;
      if (schedule.queue === "jobpilot-notifications") targetQueue = queues.notifications;
      if (schedule.queue === "jobpilot-maintenance") targetQueue = queues.maintenance;

      if (targetQueue) {
        const queueWithScheduler = targetQueue as unknown as {
          upsertJobScheduler?: (
            name: string,
            repeat: { pattern: string },
            options: { name: string; data: Record<string, unknown> }
          ) => Promise<unknown>;
        };

        if (typeof queueWithScheduler.upsertJobScheduler === "function") {
          await queueWithScheduler.upsertJobScheduler(
            `sched:${schedule.name}`,
            { pattern: schedule.cron },
            { name: schedule.name, data: schedule.defaultData }
          );
        } else {
          await targetQueue.add(schedule.name, schedule.defaultData, {
            jobId: `repeat:${schedule.name}`,
          });
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[WorkerSchedules] Failed to register schedule '${schedule.name}':`, err);
      }
    }
  }
}

/**
 * Returns the declared repeatable task definitions.
 */
export function getScheduleDefinitions(): ScheduledTaskDef[] {
  return REPEATABLE_SCHEDULES;
}
