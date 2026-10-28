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
    const { events } = await applicationTrackingService.getApplicationById(session.userId, id);
    return NextResponse.json({ events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
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
    const { reason, toStatus, details } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Event reason or note is required" }, { status: 400 });
    }

    const event = await applicationTrackingService.addApplicationEvent(session.userId, id, {
      reason,
      toStatus,
      details,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error recording event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
