import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applicationTrackingService } from "@/services/application-tracking.service";
import { duplicateDetectionService } from "@/services/duplicate-detection.service";
import type { ApplicationStatus } from "@/models/application";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ApplicationStatus | null;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const skip = searchParams.get("skip") ? Number(searchParams.get("skip")) : undefined;

    const result = await applicationTrackingService.listApplications(session.userId, {
      status: status || undefined,
      search,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing applications";
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
    const { jobId, status, submissionMethod, notes, interviewDate, followUpDate, recruiterContact } =
      body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // Run duplicate preflight check
    const dupCheck = await duplicateDetectionService.checkDuplicate(session.userId, jobId);
    if (dupCheck.isDuplicate && !body.force) {
      return NextResponse.json(
        {
          error: dupCheck.duplicateReason || "Duplicate application detected.",
          isDuplicate: true,
          duplicateCheck: dupCheck,
        },
        { status: 409 }
      );
    }

    const application = await applicationTrackingService.createApplication(session.userId, {
      jobId,
      status,
      submissionMethod,
      notes,
      interviewDate,
      followUpDate,
      recruiterContact,
    });

    return NextResponse.json({ application, isDuplicate: false }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
