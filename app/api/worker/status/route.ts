import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { isRedisConnected } from "@/lib/queue/redis";
import { getQueueMetrics } from "@/lib/queue/job-queue";
import { getScheduleDefinitions } from "@/worker/schedules";
import { isWorkerRunning } from "@/worker";
import { AgentTask } from "@/models/agent-task";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = getScheduleDefinitions();
    let isOnline = false;
    let queueMetrics = {
      isOnline: false,
      queues: [] as Array<{
        queueName: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        isPaused: boolean;
      }>,
      totalWaiting: 0,
      totalActive: 0,
      totalCompleted: 0,
      totalFailed: 0,
    };
    let pendingDbTasksCount = 0;

    try {
      await connectToDatabase();
      pendingDbTasksCount = await AgentTask.countDocuments({ status: "pending" });
    } catch {
      // Database offline graceful fallback
    }

    try {
      isOnline = await isRedisConnected();
      queueMetrics = await getQueueMetrics();
    } catch {
      // Redis offline graceful fallback
    }

    return NextResponse.json({
      isOnline,
      isWorkerRunning: isWorkerRunning(),
      redisConfigured: Boolean(process.env.REDIS_URL),
      queues: queueMetrics.queues,
      totalWaiting: queueMetrics.totalWaiting,
      totalActive: queueMetrics.totalActive,
      totalCompleted: queueMetrics.totalCompleted,
      totalFailed: queueMetrics.totalFailed,
      pendingDbTasksCount,
      schedules,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching worker status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
