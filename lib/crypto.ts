import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getMasterKey(): Buffer {
  const secret =
    process.env.KEY_ENCRYPTION_SECRET ||
    "jobpilot-development-encryption-secret-do-not-use-in-prod";
  // Derive a 32-byte (256-bit) key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns formatted string: ivHex:authTagHex:ciphertextHex
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 */
export function decryptApiKey(payload: string): string {
  if (!payload) {
    throw new Error("Cannot decrypt empty payload");
  }

  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid IV or authentication tag length");
  }

  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Returns the masked representation of an API key showing only the last 4 characters
 * e.g. "sk-...1234"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return "";
  }
  return `sk-...${apiKey.slice(-4)}`;
}
