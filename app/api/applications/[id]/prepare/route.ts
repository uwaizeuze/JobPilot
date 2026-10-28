import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { Application } from "@/models/application";
import { applicationPreparationService } from "@/services/application-preparation.service";

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
    const app = await Application.findOne({ _id: id, userId: session.userId });
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await applicationPreparationService.prepareApplication(
      session.userId,
      String(app.jobId),
      {
        resumeVersionId: body.resumeVersionId,
        coverLetterId: body.coverLetterId,
        submissionMethod: body.submissionMethod || app.submissionMethod,
        forcePrepare: body.forcePrepare,
      }
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error preparing application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
