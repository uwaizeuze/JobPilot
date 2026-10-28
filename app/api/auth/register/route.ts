import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSessionCookieOptions,
  hashPassword,
  signSessionToken,
} from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/audit-log";
import { UserPreference } from "@/models/preference";
import { ProfessionalProfile } from "@/models/profile";
import { User } from "@/models/user";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    await connectToDatabase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: "user",
    });

    // Seed empty profile and default preferences
    await ProfessionalProfile.create({
      userId: newUser._id,
      fullName: name.trim(),
      email: normalizedEmail,
      phone: "",
      currentLocation: "",
      preferredLocations: [],
      remotePreference: "remote",
      headline: "",
      summary: "",
      totalExperienceYears: 0,
      employmentHistory: [],
      technicalSkills: [],
      education: [],
      certifications: [],
      projects: [],
      workAuthorization: [],
      preferredIndustries: [],
      employmentTypes: ["full-time"],
      preferredSeniority: [],
      completenessScore: 0,
    });

    await UserPreference.create({
      userId: newUser._id,
      monthlyTokenBudget: 200000,
      tokensUsedThisMonth: 0,
      maxApplicationsPerDay: 10,
      consentPolicy: "approve",
      globalPause: false,
    });

    await AuditLog.create({
      userId: newUser._id,
      action: "USER_REGISTER",
      resource: "User",
      details: { email: normalizedEmail },
      timestamp: new Date(),
    });

    const sessionToken = await signSessionToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
    });

    const cookieOptions = getSessionCookieOptions();

    const response = NextResponse.json(
      {
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set(
      cookieOptions.name,
      sessionToken,
      cookieOptions
    );

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal registration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
