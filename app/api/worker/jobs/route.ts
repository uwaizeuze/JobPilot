import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AgentTask } from "@/models/agent-task";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    let tasks: unknown[] = [];
    let totalCount = 0;

    try {
      await connectToDatabase();
      const query: Record<string, unknown> = { userId: user.id };
      if (status && ["pending", "running", "completed", "failed", "cancelled"].includes(status)) {
        query.status = status;
      }

      tasks = await AgentTask.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      totalCount = await AgentTask.countDocuments({ userId: user.id });
    } catch {
      // Database offline graceful fallback
    }

    return NextResponse.json({
      tasks,
      totalCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching background tasks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
