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
    let status: "completed" | "paused" | "abandoned" = "completed";
    try {
      const body = await req.json();
      if (body.status) status = body.status;
    } catch {
      // default to completed
    }

    const updatedSession = await interviewCoachService.endSession(
      session.userId,
      id,
      status
    );

    return NextResponse.json({ session: updatedSession });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error ending interview session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
