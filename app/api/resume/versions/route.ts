import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ResumeVersion } from "@/models/resume";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    await connectToDatabase();

    const query: Record<string, unknown> = { userId: session.userId };
    if (jobId) {
      query.jobId = jobId;
    }

    const versions = await ResumeVersion.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ versions });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error fetching resume versions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
