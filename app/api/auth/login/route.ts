import { NextResponse } from "next/server";
import { z } from "zod";

import {
  comparePassword,
  getSessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/audit-log";
import { User } from "@/models/user";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    await connectToDatabase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await AuditLog.create({
      userId: user._id,
      action: "USER_LOGIN",
      resource: "User",
      details: { email: normalizedEmail },
      timestamp: new Date(),
    });

    const sessionToken = await signSessionToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const cookieOptions = getSessionCookieOptions();

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set(
      cookieOptions.name,
      sessionToken,
      cookieOptions
    );

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
