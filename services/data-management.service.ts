import { connectToDatabase } from "@/lib/db";
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
import { auditLogService } from "./audit-log.service";

export interface UserDataExportBundle {
  exportMetadata: {
    exportDate: string;
    schemaVersion: string;
    userId: string;
    accountEmail: string;
  };
  account: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  resumes: Array<Record<string, unknown>>;
  resumeVersions: Array<Record<string, unknown>>;
  coverLetters: Array<Record<string, unknown>>;
  applications: Array<Record<string, unknown>>;
  applicationEvents: Array<Record<string, unknown>>;
  interviewPrepPacks: Array<Record<string, unknown>>;
  mockInterviewSessions: Array<Record<string, unknown>>;
  interviewAnswers: Array<Record<string, unknown>>;
  connections: Array<Record<string, unknown>>;
  agentTasks: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  preferences: Record<string, unknown> | null;
  auditLogs: Array<Record<string, unknown>>;
}

export class DataManagementService {
  /**
   * Compiles an exhaustive, portable JSON data export bundle for the candidate.
   * Section 3 & 17: "Controls to export and delete all profile data... Private document storage, audit logging, data export and deletion."
   */
  async exportAllUserData(userId: string): Promise<UserDataExportBundle> {
    await connectToDatabase();

    const [
      user,
      profile,
      resumes,
      resumeVersions,
      coverLetters,
      applications,
      applicationEvents,
      prepPacks,
      sessions,
      answers,
      connections,
      agentTasks,
      notifications,
      preferences,
      auditLogs,
    ] = await Promise.all([
      User.findById(userId).select("-password").lean(),
      ProfessionalProfile.findOne({ userId }).lean(),
      Resume.find({ userId }).lean(),
      ResumeVersion.find({ userId }).lean(),
      CoverLetter.find({ userId }).lean(),
      Application.find({ userId }).lean(),
      ApplicationEvent.find({ userId }).lean(),
      InterviewPrepPack.find({ userId }).lean(),
      MockInterviewSession.find({ userId }).lean(),
      InterviewAnswer.find({ userId }).lean(),
      JobSourceConnection.find({ userId }).select("-authConfig").lean(),
      AgentTask.find({ userId }).lean(),
      Notification.find({ userId }).lean(),
      UserPreference.findOne({ userId }).select("-encryptedApiKey").lean(),
      AuditLog.find({ userId }).lean(),
    ]);

    if (!user) {
      throw new Error("User account not found.");
    }

    // Record audit event for data export
    await auditLogService.logEvent({
      userId,
      action: "data_exported",
      resource: "user_data_bundle",
      details: {
        recordsCount: {
          resumes: resumes.length,
          applications: applications.length,
          prepPacks: prepPacks.length,
          sessions: sessions.length,
        },
      },
    });

    return {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        schemaVersion: "1.0",
        userId,
        accountEmail: user.email,
      },
      account: user as unknown as Record<string, unknown>,
      profile: (profile as unknown as Record<string, unknown>) || null,
      resumes: resumes as unknown as Array<Record<string, unknown>>,
      resumeVersions: resumeVersions as unknown as Array<Record<string, unknown>>,
      coverLetters: coverLetters as unknown as Array<Record<string, unknown>>,
      applications: applications as unknown as Array<Record<string, unknown>>,
      applicationEvents: applicationEvents as unknown as Array<Record<string, unknown>>,
      interviewPrepPacks: prepPacks as unknown as Array<Record<string, unknown>>,
      mockInterviewSessions: sessions as unknown as Array<Record<string, unknown>>,
      interviewAnswers: answers as unknown as Array<Record<string, unknown>>,
      connections: connections as unknown as Array<Record<string, unknown>>,
      agentTasks: agentTasks as unknown as Array<Record<string, unknown>>,
      notifications: notifications as unknown as Array<Record<string, unknown>>,
      preferences: (preferences as unknown as Record<string, unknown>) || null,
      auditLogs: auditLogs as unknown as Array<Record<string, unknown>>,
    };
  }

  /**
   * Purges historical data based on the candidate's chosen retention window.
   */
  async purgeRetentionData(
    userId: string,
    retentionDays: number
  ): Promise<{
    purgedAuditLogs: number;
    purgedNotifications: number;
    purgedCompletedTasks: number;
  }> {
    await connectToDatabase();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const [auditRes, notifRes, taskRes] = await Promise.all([
      AuditLog.deleteMany({ userId, timestamp: { $lte: cutoffDate } }),
      Notification.deleteMany({ userId, read: true, createdAt: { $lte: cutoffDate } }),
      AgentTask.deleteMany({
        userId,
        status: { $in: ["completed", "cancelled"] },
        createdAt: { $lte: cutoffDate },
      }),
    ]);

    const result = {
      purgedAuditLogs: auditRes.deletedCount || 0,
      purgedNotifications: notifRes.deletedCount || 0,
      purgedCompletedTasks: taskRes.deletedCount || 0,
    };

    await auditLogService.logEvent({
      userId,
      action: "retention_purged",
      resource: "historical_logs_and_tasks",
      details: { retentionDays, ...result },
    });

    return result;
  }

  /**
   * Permanently deletes the candidate account and all associated documents across all collections.
   */
  async deleteAccountCompletely(userId: string): Promise<boolean> {
    await connectToDatabase();

    await Promise.all([
      ProfessionalProfile.deleteMany({ userId }),
      Resume.deleteMany({ userId }),
      ResumeVersion.deleteMany({ userId }),
      CoverLetter.deleteMany({ userId }),
      Application.deleteMany({ userId }),
      ApplicationEvent.deleteMany({ userId }),
      Job.deleteMany({ userId }),
      JobAnalysis.deleteMany({ userId }),
      JobSourceConnection.deleteMany({ userId }),
      AgentTask.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      UserPreference.deleteMany({ userId }),
      InterviewPrepPack.deleteMany({ userId }),
      MockInterviewSession.deleteMany({ userId }),
      InterviewAnswer.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
    ]);

    // Finally delete user record
    await User.findByIdAndDelete(userId);
    return true;
  }
}

export const dataManagementService = new DataManagementService();
