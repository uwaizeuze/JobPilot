import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Job } from "@/models/job";
import { Application } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { MockInterviewSession } from "@/models/interview";
import { AgentTask } from "@/models/agent-task";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let stats = {
      jobsDiscovered: 0,
      highMatchJobs: 0,
      applicationsSubmitted: 0,
      awaitingReview: 0,
      upcomingInterviews: 0,
      offersCount: 0,
      mockInterviewAvg: 0,
      mockSessionsCount: 0,
      failedTasksCount: 0,
      conversionFunnel: {
        discovered: 0,
        shortlisted: 0,
        applied: 0,
        interview: 0,
        offer: 0,
      },
      recentActivity: [] as Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: string;
      }>,
    };

    try {
      await connectToDatabase();

      const [
        jobsDiscovered,
        highMatchJobs,
        applicationsSubmitted,
        awaitingReview,
        upcomingInterviews,
        offersCount,
        mockSessions,
        failedTasksCount,
        recentEvents,
      ] = await Promise.all([
        Job.countDocuments({ $or: [{ userId: user.id }, { userId: { $exists: false } }] }),
        Job.countDocuments({
          $or: [{ userId: user.id }, { userId: { $exists: false } }],
          matchScore: { $gte: 80 },
        }),
        Application.countDocuments({ userId: user.id, status: "APPLIED" }),
        Application.countDocuments({
          userId: user.id,
          status: { $in: ["READY_FOR_REVIEW", "AWAITING_APPROVAL"] },
        }),
        Application.countDocuments({ userId: user.id, status: "INTERVIEW" }),
        Application.countDocuments({ userId: user.id, status: "OFFER" }),
        MockInterviewSession.find({ userId: user.id, status: "completed" })
          .select("overallScore createdAt")
          .lean(),
        AgentTask.countDocuments({ userId: user.id, status: "failed" }),
        ApplicationEvent.find({ userId: user.id })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
      ]);

      const mockScores = mockSessions
        .map((s) => s.overallScore)
        .filter((score): score is number => typeof score === "number");

      const mockAvg = mockScores.length > 0
        ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockScores.length)
        : 0;

      const totalApplications = await Application.countDocuments({ userId: user.id });

      stats = {
        jobsDiscovered,
        highMatchJobs,
        applicationsSubmitted,
        awaitingReview,
        upcomingInterviews,
        offersCount,
        mockInterviewAvg: mockAvg,
        mockSessionsCount: mockSessions.length,
        failedTasksCount,
        conversionFunnel: {
          discovered: jobsDiscovered,
          shortlisted: totalApplications,
          applied: applicationsSubmitted,
          interview: upcomingInterviews,
          offer: offersCount,
        },
        recentActivity: recentEvents.map((ev) => ({
          id: String(ev._id),
          type: "application_event",
          title: `Application transitioned to ${ev.toStatus}`,
          description: ev.reason || "Status updated in tracker",
          timestamp: ev.timestamp.toISOString(),
        })),
      };
    } catch {
      // Graceful offline database fallback
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving dashboard statistics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
