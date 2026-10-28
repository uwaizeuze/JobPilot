import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "jobpilot_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "jobpilot-development-auth-secret-do-not-use-in-production-32chars";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    userId: user.userId,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!payload.userId || !payload.email) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string) || "",
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }
    return await verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string } | null> {
  const session = await getSessionUser();
  if (!session) return null;
  return { id: session.userId, email: session.email, name: session.name };
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
