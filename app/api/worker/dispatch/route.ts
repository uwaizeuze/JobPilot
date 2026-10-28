import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  enqueueDiscoveryJob,
  enqueueMatchingJob,
  enqueueNotificationJob,
  enqueueMaintenanceJob,
} from "@/lib/queue/job-queue";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskType, params = {} } = body;

    let result;

    switch (taskType) {
      case "discovery":
        result = await enqueueDiscoveryJob({
          userId: user.id,
          query: params.query || "Software Engineer",
          location: params.location || "Remote",
          autoMatch: Boolean(params.autoMatch),
        });
        break;

      case "matching":
        if (!params.jobId) {
          return NextResponse.json({ error: "Missing required jobId parameter." }, { status: 400 });
        }
        result = await enqueueMatchingJob({
          userId: user.id,
          jobId: String(params.jobId),
          threshold: params.threshold || 80,
        });
        break;

      case "follow_up_scan":
        result = await enqueueNotificationJob({
          userId: user.id,
          type: "follow_up_scan",
        });
        break;

      case "interview_reminder_scan":
        result = await enqueueNotificationJob({
          userId: user.id,
          type: "interview_reminder_scan",
        });
        break;

      case "daily_digest":
        result = await enqueueNotificationJob({
          userId: user.id,
          type: "daily_digest",
        });
        break;

      case "revalidate_jobs":
        result = await enqueueMaintenanceJob({
          task: "revalidate_jobs",
          cutoffDays: params.cutoffDays || 30,
        });
        break;

      case "sync_sources":
        result = await enqueueMaintenanceJob({
          task: "sync_sources",
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown taskType '${taskType}'. Supported: discovery, matching, follow_up_scan, interview_reminder_scan, daily_digest, revalidate_jobs, sync_sources` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error dispatching background task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
