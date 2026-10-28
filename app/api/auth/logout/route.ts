import { NextResponse } from "next/server";

import { getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieOptions = getSessionCookieOptions();

  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieOptions.name, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  return response;
}
