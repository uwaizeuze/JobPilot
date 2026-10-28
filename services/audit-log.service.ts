import { connectToDatabase } from "@/lib/db";
import { AuditLog, IAuditLog } from "@/models/audit-log";

export interface LogSecurityEventInput {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  /**
   * Sanitizes details object by redacting sensitive secrets, passwords, or raw resume contents.
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;
    const sanitized: Record<string, unknown> = {};

    const SENSITIVE_KEYS = [
      "password",
      "secret",
      "token",
      "apikey",
      "encryptedapikey",
      "resumetext",
      "rawresume",
      "coverlettertext",
      "cookie",
      "authorization",
    ];

    for (const [k, v] of Object.entries(details)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z]/g, "");
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        sanitized[k] = this.sanitizeDetails(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }

    return sanitized;
  }

  /**
   * Records a security event to the immutable AuditLog collection.
   */
  async logEvent(input: LogSecurityEventInput): Promise<IAuditLog | null> {
    try {
      await connectToDatabase();
      const sanitized = this.sanitizeDetails(input.details);

      return await AuditLog.create({
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        details: sanitized,
        ipAddress: input.ipAddress || "",
        userAgent: input.userAgent || "",
        timestamp: new Date(),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[AuditLog] Failed to record audit log event:", err);
      }
      return null;
    }
  }

  /**
   * Fetches recent security and activity audit logs for a candidate.
   */
  async getRecentLogs(userId: string, limit = 50): Promise<IAuditLog[]> {
    try {
      await connectToDatabase();
      return await AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch {
      return [];
    }
  }

  /**
   * Purges user audit logs older than a given number of days.
   */
  async purgeOldLogs(userId: string, olderThanDays: number): Promise<number> {
    try {
      await connectToDatabase();
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const res = await AuditLog.deleteMany({
        userId,
        timestamp: { $lte: cutoff },
      });
      return res.deletedCount || 0;
    } catch {
      return 0;
    }
  }
}

export const auditLogService = new AuditLogService();
