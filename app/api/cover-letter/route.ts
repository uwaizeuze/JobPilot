import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CoverLetter } from "@/models/cover-letter";

const UpdateCoverLetterSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  content: z.string().min(1, "content is required"),
  tone: z.enum(["professional", "enthusiastic", "concise", "custom"]).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const coverLetter = await CoverLetter.findOne({
      userId: session.userId,
      jobId,
    }).lean();

    return NextResponse.json({ coverLetter });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error fetching cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateCoverLetterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updated = await CoverLetter.findOneAndUpdate(
      { userId: session.userId, jobId: parsed.data.jobId },
      {
        content: parsed.data.content,
        ...(parsed.data.tone ? { tone: parsed.data.tone } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      coverLetter: updated,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error saving cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
