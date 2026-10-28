import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { agentOrchestrationService } from "@/services/agent-orchestration.service";

const CancelTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CancelTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cancelled = await agentOrchestrationService.cancelAgentTask(
      session.userId,
      parsed.data.taskId
    );

    if (!cancelled) {
      return NextResponse.json(
        { error: `Task '${parsed.data.taskId}' not found or cannot be cancelled.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Agent task cancelled successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error cancelling agent task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
