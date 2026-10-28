import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataManagementService } from "@/services/data-management.service";
import { auditLogService } from "@/services/audit-log.service";
import { checkRateLimit } from "@/lib/rate-limiter";
import { User } from "@/models/user";
import { ProfessionalProfile } from "@/models/profile";
import { Resume, ResumeVersion } from "@/models/resume";
import { CoverLetter } from "@/models/cover-letter";
import { Application } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { Job } from "@/models/job";
import { JobAnalysis } from "@/models/job-analysis";
import { JobSourceConnection } from "@/models/connection";
import { AgentTask } from "@/models/agent-task";
import { Notification } from "@/models/notification";
import { UserPreference } from "@/models/preference";
import {
  InterviewPrepPack,
  MockInterviewSession,
  InterviewAnswer,
} from "@/models/interview";
import { AuditLog } from "@/models/audit-log";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

describe("Phase 11: Data Management, Security & Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rate Limiting Service", () => {
    it("allows requests under the category limit and decrements remaining", () => {
      const mockReq = new Request("http://localhost/api/test");
      const userId = `user-rl-${Date.now()}`;

      const res1 = checkRateLimit(mockReq, "export", userId);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(4); // limit is 5 for export

      const res2 = checkRateLimit(mockReq, "export", userId);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it("blocks requests when limit is exceeded and returns reset time", () => {
      const mockReq = new Request("http://localhost/api/test");
      const userId = `user-block-${Date.now()}`;

      // Limit is 5 for export
      for (let i = 0; i < 5; i++) {
        checkRateLimit(mockReq, "export", userId);
      }

      const blockedRes = checkRateLimit(mockReq, "export", userId);
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe("Audit Log Service & Privacy Redaction", () => {
    it("redacts passwords, raw resume text, and API keys before persisting", async () => {
      vi.spyOn(AuditLog, "create").mockResolvedValue({} as never);

      await auditLogService.logEvent({
        userId: "user-sec-1",
        action: "ai_key_configured",
        resource: "user_preference",
        details: {
          apiKey: "sk-proj-super-secret-12345",
          passwordHash: "bcrypt-hash-to-redact",
          resumeText: "My full candidate resume contents",
          safeMetadata: "gpt-4o",
        },
      });

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-sec-1",
          action: "ai_key_configured",
          details: {
            apiKey: "[REDACTED]",
            passwordHash: "[REDACTED]",
            resumeText: "[REDACTED]",
            safeMetadata: "gpt-4o",
          },
        })
      );
    });
  });

  describe("Data Management Service", () => {
    const validUserId = "507f1f77bcf86cd799439011";
    const validPurgeUserId = "507f191e810c19729de860ea";
    const validDelUserId = "507f191e810c19729de860eb";

    it("compiles a complete export bundle with excluded sensitive credentials", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: validUserId,
            name: "Alex Dev",
            email: "alex@example.com",
            createdAt: new Date(),
          }),
        }),
      } as never);

      vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ headline: "Staff Architect" }),
      } as never);

      vi.spyOn(Resume, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ title: "Master Resume" }]),
      } as never);

      vi.spyOn(ResumeVersion, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(CoverLetter, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(Application, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ status: "APPLIED" }]),
      } as never);

      vi.spyOn(ApplicationEvent, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(InterviewPrepPack, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(MockInterviewSession, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(InterviewAnswer, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(JobSourceConnection, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      vi.spyOn(AgentTask, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(Notification, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(UserPreference, "findOne").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as never);

      vi.spyOn(AuditLog, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      vi.spyOn(auditLogService, "logEvent").mockResolvedValue({} as never);

      const bundle = await dataManagementService.exportAllUserData(validUserId);

      expect(bundle.exportMetadata.userId).toBe(validUserId);
      expect(bundle.exportMetadata.accountEmail).toBe("alex@example.com");
      expect(bundle.exportMetadata.schemaVersion).toBe("1.0");
      expect(bundle.account.name).toBe("Alex Dev");
      expect(bundle.profile).toHaveProperty("headline", "Staff Architect");
      expect(bundle.resumes).toHaveLength(1);
      expect(auditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "data_exported",
        })
      );
    });

    it("purges historical data based on retention policy days", async () => {
      vi.spyOn(AuditLog, "deleteMany").mockResolvedValue({ deletedCount: 15 } as never);
      vi.spyOn(Notification, "deleteMany").mockResolvedValue({ deletedCount: 8 } as never);
      vi.spyOn(AgentTask, "deleteMany").mockResolvedValue({ deletedCount: 5 } as never);
      vi.spyOn(auditLogService, "logEvent").mockResolvedValue({} as never);

      const result = await dataManagementService.purgeRetentionData(validPurgeUserId, 60);

      expect(result.purgedAuditLogs).toBe(15);
      expect(result.purgedNotifications).toBe(8);
      expect(result.purgedCompletedTasks).toBe(5);
      expect(AuditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validPurgeUserId,
          timestamp: expect.any(Object),
        })
      );
    });

    it("cascades permanent deletion across all collections and removes user", async () => {
      vi.spyOn(ProfessionalProfile, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(Resume, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(ResumeVersion, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(CoverLetter, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(Application, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(ApplicationEvent, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(Job, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(JobAnalysis, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(InterviewPrepPack, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(MockInterviewSession, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(InterviewAnswer, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(JobSourceConnection, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(AgentTask, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(Notification, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(UserPreference, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(AuditLog, "deleteMany").mockResolvedValue({} as never);
      vi.spyOn(User, "findByIdAndDelete").mockResolvedValue({} as never);

      const success = await dataManagementService.deleteAccountCompletely(validDelUserId);
      expect(success).toBe(true);
      expect(ProfessionalProfile.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(Resume.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(ResumeVersion.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(CoverLetter.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(Application.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(Job.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(JobAnalysis.deleteMany).toHaveBeenCalledWith({ userId: validDelUserId });
      expect(User.findByIdAndDelete).toHaveBeenCalledWith(validDelUserId);
    });
  });
});
