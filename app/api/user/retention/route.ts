import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataManagementService } from "@/services/data-management.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const days = parseInt(body.retentionDays || "90", 10);

    if (isNaN(days) || days < 7 || days > 365) {
      return NextResponse.json(
        { error: "Retention days must be between 7 and 365." },
        { status: 400 }
      );
    }

    const result = await dataManagementService.purgeRetentionData(user.id, days);

    return NextResponse.json({
      success: true,
      retentionDays: days,
      result,
      message: `Purged ${result.purgedAuditLogs} audit logs, ${result.purgedNotifications} read notifications, and ${result.purgedCompletedTasks} historical tasks older than ${days} days.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error purging retention data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
