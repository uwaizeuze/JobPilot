import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AgentTask } from "@/models/agent-task";
import {
  enqueueDiscoveryJob,
  enqueueMatchingJob,
  enqueueNotificationJob,
  enqueueMaintenanceJob,
} from "@/lib/queue/job-queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const task = await AgentTask.findOne({ _id: id, userId: user.id });
    if (!task) {
      return NextResponse.json({ error: "Background task not found." }, { status: 404 });
    }

    // Reset task
    task.status = "pending";
    task.error = undefined;
    task.retryCount = 0;
    task.startedAt = undefined;
    task.completedAt = undefined;
    await task.save();

    // Re-enqueue based on taskType
    const payload = (task.payload || {}) as Record<string, unknown>;
    let enqueueResult;

    if (task.taskType === "job_discovery") {
      enqueueResult = await enqueueDiscoveryJob({
        userId: user.id,
        query: (payload.query as string) || "Software Engineer",
        location: (payload.location as string) || "Remote",
        autoMatch: Boolean(payload.autoMatch),
      });
    } else if (task.taskType === "job_matching") {
      enqueueResult = await enqueueMatchingJob({
        userId: user.id,
        jobId: (payload.jobId as string) || "",
        threshold: (payload.threshold as number) || 80,
      });
    } else if (task.taskType.startsWith("notification_")) {
      const notifType = task.taskType.replace("notification_", "") as
        | "email"
        | "follow_up_scan"
        | "interview_reminder_scan"
        | "daily_digest";
      enqueueResult = await enqueueNotificationJob({
        userId: user.id,
        type: notifType,
      });
    } else {
      enqueueResult = await enqueueMaintenanceJob({
        task: (task.taskType as "revalidate_jobs" | "sync_sources") || "revalidate_jobs",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Task retry triggered.",
      task,
      enqueueResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrying task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
