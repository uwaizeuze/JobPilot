import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Application } from "@/models/application";
import { CoverLetter } from "@/models/cover-letter";
import { UserPreference } from "@/models/preference";
import { ProfessionalProfile } from "@/models/profile";
import { Resume, ResumeVersion } from "@/models/resume";
import { User } from "@/models/user";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [user, profile, preference, resumes, resumeVersions, coverLetters, applications] =
      await Promise.all([
        User.findById(session.userId).select("-passwordHash").lean(),
        ProfessionalProfile.findOne({ userId: session.userId }).lean(),
        UserPreference.findOne({ userId: session.userId }).select("-encryptedApiKey").lean(),
        Resume.find({ userId: session.userId }).lean(),
        ResumeVersion.find({ userId: session.userId }).lean(),
        CoverLetter.find({ userId: session.userId }).lean(),
        Application.find({ userId: session.userId }).lean(),
      ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      preference,
      resumes,
      resumeVersions,
      coverLetters,
      applications,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="jobpilot-data-export-${session.userId}.json"`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
