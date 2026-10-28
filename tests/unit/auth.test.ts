// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  comparePassword,
  hashPassword,
  signSessionToken,
  verifySessionToken,
} from "../../lib/auth";

describe("authentication and session token utilities", () => {
  it("hashes password and securely verifies matching credentials", async () => {
    const rawPassword = "StrongSecretPassword123!";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(rawPassword);
    expect(hashed.startsWith("$2")).toBe(true);

    const matches = await comparePassword(rawPassword, hashed);
    expect(matches).toBe(true);

    const wrongMatch = await comparePassword("WrongPassword123!", hashed);
    expect(wrongMatch).toBe(false);
  });

  it("signs and verifies JWT session tokens with claims", async () => {
    const userPayload = {
      userId: "user_64f1a2b3c4d5e6f7a8b9c0d1",
      email: "engineer@jobpilot.io",
      name: "Lead Engineer",
    };

    const token = await signSessionToken(userPayload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(userPayload.userId);
    expect(verified?.email).toBe(userPayload.email);
    expect(verified?.name).toBe(userPayload.name);
  });

  it("rejects invalid or tampered session tokens", async () => {
    const tamperedToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.InvalidSignature";
    const result = await verifySessionToken(tamperedToken);
    expect(result).toBeNull();
  });
});
