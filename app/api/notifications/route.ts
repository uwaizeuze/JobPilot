import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/notification";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const query: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ userId: user.id, read: false }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching notifications";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    if (body.all) {
      await Notification.updateMany({ userId: user.id, read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (body.id) {
      await Notification.findOneAndUpdate({ _id: body.id, userId: user.id }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    if (Array.isArray(body.ids)) {
      await Notification.updateMany({ _id: { $in: body.ids }, userId: user.id }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: "Notifications marked as read." });
    }

    return NextResponse.json({ error: "Provide 'id', 'ids', or 'all: true'" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error updating notifications";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      await Notification.deleteMany({ userId: user.id });
      return NextResponse.json({ success: true, message: "All notifications cleared." });
    }

    if (id) {
      await Notification.findOneAndDelete({ _id: id, userId: user.id });
      return NextResponse.json({ success: true, message: "Notification deleted." });
    }

    return NextResponse.json({ error: "Provide 'id' or 'all=true'" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error deleting notifications";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
