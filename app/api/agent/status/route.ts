import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { agentOrchestrationService } from "@/services/agent-orchestration.service";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await agentOrchestrationService.getRecentTasks(session.userId, 20);

    return NextResponse.json({
      success: true,
      tasks: tasks.map((t) => ({
        id: String(t._id),
        taskType: t.taskType,
        status: t.status,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        error: t.error,
        result: t.result,
        payload: t.payload,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving agent status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
