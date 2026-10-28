import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { duplicateDetectionService } from "@/services/duplicate-detection.service";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, company, title, originalUrl, rollingDays } = body;

    if (jobId) {
      const result = await duplicateDetectionService.checkDuplicate(
        session.userId,
        jobId,
        rollingDays
      );
      return NextResponse.json(result);
    }

    if (company && title) {
      const result = await duplicateDetectionService.checkExternalDuplicate(
        session.userId,
        company,
        title,
        originalUrl,
        rollingDays
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide either jobId or both company and title for duplicate check." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking duplicate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
