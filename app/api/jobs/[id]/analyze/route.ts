import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { jobAnalysisService } from "@/services/job-analysis.service";
import { jobMatchingService } from "@/services/job-matching.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Run structured job analysis
    const analysisResult = await jobAnalysisService.analyzeJob(session.userId, id);

    // 2. Run deterministic matching evaluation
    const matchResult = await jobMatchingService.calculateMatch(session.userId, id);

    return NextResponse.json({
      success: true,
      analysis: analysisResult.analysis,
      tokensUsed: analysisResult.tokensUsed,
      match: matchResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error analyzing job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
