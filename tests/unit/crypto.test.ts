// @vitest-environment node
import { describe, expect, it } from "vitest";

import { decryptApiKey, encryptApiKey, maskApiKey } from "@/lib/crypto";

describe("Phase 5: AES-256-GCM Crypto Security", () => {
  it("encrypts and decrypts API key accurately", () => {
    const rawKey = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";
    const encrypted = encryptApiKey(rawKey);

    expect(encrypted).not.toBe(rawKey);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it("produces different ciphertexts for the same plaintext due to random IV", () => {
    const rawKey = "sk-proj-super-secret-key-1234";
    const enc1 = encryptApiKey(rawKey);
    const enc2 = encryptApiKey(rawKey);

    expect(enc1).not.toBe(enc2);
    expect(decryptApiKey(enc1)).toBe(rawKey);
    expect(decryptApiKey(enc2)).toBe(rawKey);
  });

  it("throws error when ciphertext or auth tag is tampered with", () => {
    const rawKey = "sk-proj-valid-key";
    const encrypted = encryptApiKey(rawKey);
    const [ivHex, tagHex, cipherHex] = encrypted.split(":");

    // Tamper with the ciphertext by flipping a byte
    const tamperedCipher =
      cipherHex.slice(0, -2) + (cipherHex.slice(-2) === "aa" ? "bb" : "aa");
    const tamperedPayload = `${ivHex}:${tagHex}:${tamperedCipher}`;

    expect(() => decryptApiKey(tamperedPayload)).toThrow();
  });

  it("throws error on malformed encrypted payload", () => {
    expect(() => decryptApiKey("invalid-payload-without-colons")).toThrow(
      "Malformed encrypted payload format"
    );
  });

  it("masks API key showing only the last 4 characters", () => {
    expect(maskApiKey("sk-proj-abc123xyz9876")).toBe("sk-...9876");
    expect(maskApiKey("")).toBe("");
  });
});
