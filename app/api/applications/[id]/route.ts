import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applicationTrackingService } from "@/services/application-tracking.service";

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
    const result = await applicationTrackingService.getApplicationById(session.userId, id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching application";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await applicationTrackingService.updateApplication(session.userId, id, body);
    return NextResponse.json({ application: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating application";
    const status = message.includes("Invalid application status transition")
      ? 400
      : message.includes("not found")
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
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
    const success = await applicationTrackingService.deleteApplication(session.userId, id);
    if (!success) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Application deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
