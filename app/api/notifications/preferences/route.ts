import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { UserPreference } from "@/models/preference";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let pref = await UserPreference.findOne({ userId: user.id });

    if (!pref) {
      pref = await UserPreference.create({ userId: user.id });
    }

    const defaultPrefs = {
      inApp: true,
      email: true,
      dailyDigest: false,
      highMatchThreshold: 80,
      events: {
        high_match_found: true,
        resume_generated: true,
        application_ready_for_review: true,
        submitted: true,
        failed: true,
        interview_scheduled: true,
        follow_up_due: true,
        integration_disconnected: true,
        daily_summary: true,
      },
    };

    return NextResponse.json({
      preferences: pref.notificationPreferences || defaultPrefs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching notification preferences";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (typeof body.inApp === "boolean") {
      update["notificationPreferences.inApp"] = body.inApp;
    }
    if (typeof body.email === "boolean") {
      update["notificationPreferences.email"] = body.email;
    }
    if (typeof body.dailyDigest === "boolean") {
      update["notificationPreferences.dailyDigest"] = body.dailyDigest;
    }
    if (typeof body.highMatchThreshold === "number") {
      update["notificationPreferences.highMatchThreshold"] = Math.max(50, Math.min(100, body.highMatchThreshold));
    }
    if (body.events && typeof body.events === "object") {
      for (const [key, val] of Object.entries(body.events)) {
        if (typeof val === "boolean") {
          update[`notificationPreferences.events.${key}`] = val;
        }
      }
    }

    const updated = await UserPreference.findOneAndUpdate(
      { userId: user.id },
      { $set: update },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      preferences: updated.notificationPreferences,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving notification preferences";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
