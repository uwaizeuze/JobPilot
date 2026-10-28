import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { interviewCoachService } from "@/services/interview-coach.service";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const { questionNumber, questionText, answerText, totalQuestions = 4 } = body;

    if (!questionText || !answerText) {
      return NextResponse.json(
        { error: "questionText and answerText are required" },
        { status: 400 }
      );
    }

    const result = await interviewCoachService.submitAnswer(
      session.userId,
      id,
      Number(questionNumber) || 1,
      questionText,
      answerText,
      Number(totalQuestions) || 4
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error evaluating interview answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
