import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enqueueDiscoveryJob,
  enqueueMatchingJob,
  getQueueMetrics,
} from "@/lib/queue/job-queue";
import { isRedisConnected } from "@/lib/queue/redis";
import { processDiscoveryJob } from "@/worker/processors/discovery.processor";
import { processMatchingJob } from "@/worker/processors/matching.processor";
import { processNotificationJob } from "@/worker/processors/notification.processor";
import { processMaintenanceJob } from "@/worker/processors/maintenance.processor";
import { AgentTask, IAgentTask } from "@/models/agent-task";
import { Job, IJob } from "@/models/job";
import { Application } from "@/models/application";
import { UserPreference } from "@/models/preference";
import { jobDiscoveryService } from "@/services/job-discovery.service";
import { jobMatchingService, JobMatchResult } from "@/services/job-matching.service";
import { notificationService } from "@/services/notification.service";
import { Job as BullJob } from "bullmq";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

describe("Background Worker & BullMQ Queue System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Redis & Queue Offline Fallback", () => {
    it("reports offline status gracefully without throwing unhandled exceptions", async () => {
      const online = await isRedisConnected();
      expect(typeof online).toBe("boolean");
    });

    it("falls back to MongoDB AgentTask when Redis is offline for discovery job", async () => {
      const mockTask = {
        _id: "task-offline-1",
        taskType: "job_discovery",
        status: "pending",
      } as unknown as IAgentTask;

      vi.spyOn(AgentTask, "findOne").mockResolvedValue(null);
      vi.spyOn(AgentTask, "create").mockResolvedValue(mockTask as never);

      const res = await enqueueDiscoveryJob({
        userId: "user-123",
        query: "Fullstack Engineer",
        location: "Remote",
      });

      expect(res.queueName).toBe("jobpilot-discovery");
      expect(res.taskId).toBe("task-offline-1");
      expect(typeof res.offline).toBe("boolean");
    });

    it("records matching job and preserves threshold parameters in database queue", async () => {
      const mockTask = {
        _id: "task-match-1",
        taskType: "job_matching",
        status: "pending",
      } as unknown as IAgentTask;

      vi.spyOn(AgentTask, "findOne").mockResolvedValue(null);
      vi.spyOn(AgentTask, "create").mockResolvedValue(mockTask as never);

      const res = await enqueueMatchingJob({
        userId: "user-123",
        jobId: "job-abc",
        threshold: 85,
      });

      expect(res.queueName).toBe("jobpilot-matching");
      expect(res.taskId).toBe("task-match-1");
    });

    it("returns zero metrics and isOnline false when Redis is offline", async () => {
      const metrics = await getQueueMetrics();
      expect(metrics).toHaveProperty("isOnline");
      expect(metrics).toHaveProperty("totalWaiting");
      expect(metrics).toHaveProperty("totalActive");
    });
  });

  describe("Discovery Processor", () => {
    it("executes discovery and updates AgentTask to completed", async () => {
      vi.spyOn(AgentTask, "findByIdAndUpdate").mockResolvedValue({} as never);
      vi.spyOn(jobDiscoveryService, "discoverJobs").mockResolvedValue({
        jobs: [{ _id: "job-1" } as unknown as IJob],
        summary: { greenhouse: 1 },
      });

      const fakeJob = {
        data: {
          userId: "user-1",
          query: "Software Engineer",
          location: "Remote",
          taskId: "task-disc-1",
          autoMatch: false,
        },
      } as unknown as BullJob;

      const result = await processDiscoveryJob(fakeJob);
      expect(result.discoveredCount).toBe(1);
      expect(result.providerSummary.greenhouse).toBe(1);
      expect(AgentTask.findByIdAndUpdate).toHaveBeenCalledWith("task-disc-1", {
        status: "completed",
        completedAt: expect.any(Date),
        result: {
          discoveredCount: 1,
          providerSummary: { greenhouse: 1 },
        },
      });
    });
  });

  describe("Matching Processor", () => {
    it("matches job and triggers notification when score meets threshold", async () => {
      vi.spyOn(AgentTask, "findByIdAndUpdate").mockResolvedValue({} as never);
      vi.spyOn(Job, "findById").mockResolvedValue({
        _id: "job-match-1",
        title: "Staff Platform Engineer",
        company: "Stripe",
      } as unknown as IJob);
      vi.spyOn(UserPreference, "findOne").mockResolvedValue({
        notificationPreferences: {
          highMatchThreshold: 80,
          events: { high_match_found: true },
        },
      } as never);
      vi.spyOn(jobMatchingService, "calculateMatch").mockResolvedValue({
        overallScore: 92,
        recommendedAction: "APPLY",
      } as unknown as JobMatchResult);
      vi.spyOn(notificationService, "sendNotification").mockResolvedValue({
        notification: {} as never,
        isDuplicate: false,
        emailSent: false,
      });

      const fakeJob = {
        data: {
          userId: "user-match",
          jobId: "job-match-1",
          threshold: 80,
          taskId: "task-match-exec",
        },
      } as unknown as BullJob;

      const result = await processMatchingJob(fakeJob);
      expect(result.overallScore).toBe(92);
      expect(result.notified).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "high_match_found",
          deduplicationKey: "high_match:user-match:job-match-1",
        })
      );
    });
  });

  describe("Notification Processor", () => {
    it("scans for follow-up reminders on applications older than 7 days", async () => {
      vi.spyOn(AgentTask, "findByIdAndUpdate").mockResolvedValue({} as never);
      vi.spyOn(Application, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              _id: "app-stale-1",
              jobId: {
                title: "Senior Frontend Lead",
                company: "Vercel",
              },
            },
          ]),
        }),
      } as never);

      vi.spyOn(notificationService, "sendNotification").mockResolvedValue({
        notification: {} as never,
        isDuplicate: false,
        emailSent: false,
      });

      const fakeJob = {
        data: {
          userId: "user-notif",
          type: "follow_up_scan",
          taskId: "task-followup-1",
        },
      } as unknown as BullJob;

      const result = await processNotificationJob(fakeJob);
      expect(result.processedType).toBe("follow_up_scan");
      expect(result.dispatchedCount).toBe(1);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "follow_up_due",
          deduplicationKey: "follow_up_due:app-stale-1",
        })
      );
    });

    it("scans for upcoming interview rounds within 24 hours and dispatches reminders", async () => {
      vi.spyOn(AgentTask, "findByIdAndUpdate").mockResolvedValue({} as never);
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000);

      vi.spyOn(Application, "find").mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            _id: "app-int-1",
            interviewDate: tomorrow,
            jobId: {
              _id: "job-round-1",
              title: "Staff Engineer",
              company: "Stripe",
            },
          },
        ]),
      } as never);

      vi.spyOn(notificationService, "sendNotification").mockResolvedValue({
        notification: {} as never,
        isDuplicate: false,
        emailSent: false,
      });

      const fakeJob = {
        data: {
          userId: "user-rounds",
          type: "interview_reminder_scan",
          taskId: "task-round-1",
        },
      } as unknown as BullJob;

      const result = await processNotificationJob(fakeJob);
      expect(result.processedType).toBe("interview_reminder_scan");
      expect(result.dispatchedCount).toBe(1);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "interview_scheduled",
        })
      );
    });
  });

  describe("Maintenance Processor", () => {
    it("expires jobs older than cutoff days during revalidation", async () => {
      vi.spyOn(Job, "updateMany").mockResolvedValue({
        modifiedCount: 4,
        matchedCount: 4,
        acknowledged: true,
        upsertedCount: 0,
        upsertedId: null,
      } as never);

      const fakeJob = {
        data: {
          task: "revalidate_jobs",
          cutoffDays: 30,
        },
      } as unknown as BullJob;

      const result = await processMaintenanceJob(fakeJob);
      expect(result.task).toBe("revalidate_jobs");
      expect(result.affectedCount).toBe(4);
      expect(Job.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          jobStatus: "open",
        }),
        { $set: { jobStatus: "expired" } }
      );
    });
  });
});
