import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Job } from "@/models/job";

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
    await connectToDatabase();

    const job = await Job.findById(id).lean();

    if (!job) {
      return NextResponse.json({ error: "Job listing not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching job listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
