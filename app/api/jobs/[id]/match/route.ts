import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { jobMatchingService } from "@/services/job-matching.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const matchResult = await jobMatchingService.calculateMatch(session.userId, id);

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error calculating match";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
