import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Application } from "@/models/application";
import { interviewCoachService } from "@/services/interview-coach.service";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const applications = await Application.find({
      userId: session.userId,
      $or: [
        { status: "INTERVIEW" },
        { interviewDate: { $exists: true, $ne: null } },
      ],
    })
      .sort({ interviewDate: 1, updatedAt: -1 })
      .populate("jobId", "title company location workMode")
      .exec();

    return NextResponse.json({ events: applications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving interview calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, interviewDate } = body;

    if (!applicationId || !interviewDate) {
      return NextResponse.json(
        { error: "applicationId and interviewDate are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const application = await Application.findOne({
      _id: applicationId,
      userId: session.userId,
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    application.interviewDate = new Date(interviewDate);
    if (application.status !== "INTERVIEW" && application.status !== "OFFER") {
      application.status = "INTERVIEW";
      application.statusReason = "Interview date scheduled.";
    }
    await application.save();

    // Trigger auto-prep pack generation and reminder
    const hookRes = await interviewCoachService.onApplicationMovedToInterview(
      session.userId,
      applicationId
    );

    return NextResponse.json({
      application,
      prepPack: hookRes.prepPack,
      notified: hookRes.notified,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error scheduling interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
