import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { interviewCoachService } from "@/services/interview-coach.service";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await interviewCoachService.getAnalytics(session.userId);
    return NextResponse.json(analytics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching interview sessions";
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
    const {
      jobId,
      roleTitle,
      interviewType = "mixed",
      difficulty = "mid",
      durationMinutes = 30,
      totalQuestions = 4,
    } = body;

    const result = await interviewCoachService.startMockInterview(session.userId, {
      jobId,
      roleTitle,
      interviewType,
      difficulty,
      durationMinutes,
      totalQuestions,
    });

    return NextResponse.json({
      session: result.session,
      firstQuestion: result.firstQuestion,
      totalQuestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error starting mock interview session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
