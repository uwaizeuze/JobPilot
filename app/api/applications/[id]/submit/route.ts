import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applicationSubmissionService } from "@/services/application-submission.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const result = await applicationSubmissionService.submitApplication(session.userId, id);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error submitting application";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
