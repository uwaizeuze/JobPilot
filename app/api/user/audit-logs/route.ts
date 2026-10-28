import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { auditLogService } from "@/services/audit-log.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await auditLogService.getRecentLogs(user.id, limit);

    return NextResponse.json({
      logs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching audit logs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
