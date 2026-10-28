import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ResumeVersion } from "@/models/resume";

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

    const version = await ResumeVersion.findOne({
      _id: id,
      userId: session.userId,
    }).lean();

    if (!version) {
      return NextResponse.json(
        { error: "Resume version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ version });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error loading resume version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const deleted = await ResumeVersion.findOneAndDelete({
      _id: id,
      userId: session.userId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Resume version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Resume version deleted.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error deleting resume version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
