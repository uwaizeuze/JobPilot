import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/user";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select("-passwordHash");

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal session error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
