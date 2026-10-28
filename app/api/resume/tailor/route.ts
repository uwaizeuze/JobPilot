import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { resumeGenerationService } from "@/services/resume-generation.service";

const TailorSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  customSummary: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = TailorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await resumeGenerationService.generateTailoredResume(
      session.userId,
      parsed.data.jobId,
      { customSummary: parsed.data.customSummary }
    );

    return NextResponse.json({
      success: true,
      version: result.version,
      unsupportedClaims: result.unsupportedClaims,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error tailoring resume draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
