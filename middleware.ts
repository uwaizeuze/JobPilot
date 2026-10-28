import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { SESSION_COOKIE_NAME } from "./lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/resumes",
  "/tracker",
  "/cover-letters",
  "/interviews",
  "/settings",
  "/onboarding",
  "/notifications",
];

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "jobpilot-development-auth-secret-do-not-use-in-production-32chars";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = getJwtSecret();
    await jwtVerify(sessionCookie.value, secret, {
      algorithms: ["HS256"],
    });
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
