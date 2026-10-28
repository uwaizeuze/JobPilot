import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { agentOrchestrationService } from "@/services/agent-orchestration.service";

const RunPipelineSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  minimumMatchThreshold: z.number().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RunPipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await agentOrchestrationService.runJobApplicationPipeline(
      session.userId,
      parsed.data.jobId,
      {
        minimumMatchThreshold: parsed.data.minimumMatchThreshold,
      }
    );

    return NextResponse.json({
      success: result.status !== "failed",
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error running agent pipeline";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
