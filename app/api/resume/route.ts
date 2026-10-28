import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/audit-log";
import { Resume, ResumeVersion } from "@/models/resume";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [resumes, versions] = await Promise.all([
      Resume.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .select("-rawText")
        .lean(),
      ResumeVersion.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      resumes,
      versions,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error loading resumes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get("id");

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deleted = await Resume.findOneAndDelete({
      _id: resumeId,
      userId: session.userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    await AuditLog.create({
      userId: session.userId,
      action: "RESUME_DELETE",
      resource: "Resume",
      details: { resumeId },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, message: "Resume deleted" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error deleting resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
