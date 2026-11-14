import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { agentOrchestrationService } from "@/services/agent-orchestration.service";

const RunPipelineSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  minimumMatchThreshold: z.number().min(0).max(100).optional(),
  force: z.boolean().optional(),
  stream: z.boolean().optional(),
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

    // Server-Sent Events streaming mode for real-time live step progress
    if (parsed.data.stream) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      const send = async (event: string, payload: unknown) => {
        try {
          await writer.write(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // stream connection closed
        }
      };

      (async () => {
        try {
          const result = await agentOrchestrationService.runJobApplicationPipeline(
            session.userId,
            parsed.data.jobId,
            {
              minimumMatchThreshold: parsed.data.minimumMatchThreshold,
              force: parsed.data.force,
              onStepUpdate: async (step, status, message, progress, details) => {
                await send("step", {
                  step,
                  status,
                  message,
                  progress,
                  details,
                  timestamp: new Date().toISOString(),
                });
              },
            }
          );

          await send("complete", {
            success: result.status !== "failed",
            ...result,
          });
        } catch (err: unknown) {
          const rawMsg = err instanceof Error ? err.message : "Error running agent pipeline";
          await send("error", { error: rawMsg });
        } finally {
          try {
            await writer.close();
          } catch {
            // writer already closed
          }
        }
      })();

      return new Response(stream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Standard synchronous JSON execution
    const result = await agentOrchestrationService.runJobApplicationPipeline(
      session.userId,
      parsed.data.jobId,
      {
        minimumMatchThreshold: parsed.data.minimumMatchThreshold,
        force: parsed.data.force,
      }
    );

    return NextResponse.json({
      success: result.status !== "failed",
      ...result,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : "Error running agent pipeline";
    let userMsg = rawMsg;
    if (rawMsg.includes("E11000 duplicate key")) {
      userMsg = "A workflow task is already registered for this job. Please try running again.";
    }
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
