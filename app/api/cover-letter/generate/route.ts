import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { coverLetterService } from "@/services/cover-letter.service";

const GenerateSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  tone: z.enum(["professional", "enthusiastic", "concise", "custom"]).default("professional"),
  resumeVersionId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await coverLetterService.generateCoverLetter(
      session.userId,
      parsed.data.jobId,
      {
        tone: parsed.data.tone,
        resumeVersionId: parsed.data.resumeVersionId,
      }
    );

    return NextResponse.json({
      success: true,
      coverLetter: result.coverLetter,
      content: result.content,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error generating cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
