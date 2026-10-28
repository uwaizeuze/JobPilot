import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InterviewAnswer, MockInterviewSession } from "@/models/interview";
import { interviewCoachService } from "@/services/interview-coach.service";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    await connectToDatabase();

    const mockSession = await MockInterviewSession.findOne({
      _id: id,
      userId: session.userId,
    }).populate("jobId", "title company location");

    if (!mockSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const answers = await InterviewAnswer.find({ sessionId: mockSession._id })
      .sort({ questionNumber: 1 })
      .exec();

    return NextResponse.json({
      session: mockSession,
      answers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const deleted = await interviewCoachService.deleteSession(session.userId, id);

    if (!deleted) {
      return NextResponse.json({ error: "Session not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
