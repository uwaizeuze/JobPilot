import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window store (can be connected to Redis if available)
const memoryStore = new Map<string, RateLimitRecord>();

export type RateLimitCategory = "auth" | "ai" | "export" | "standard";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  auth: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 attempts / min
  ai: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 AI calls / min
  export: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 data exports / min
  standard: { maxRequests: 120, windowMs: 60 * 1000 }, // 120 requests / min
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks client rate limit against an in-memory sliding window bucket.
 */
export function checkRateLimit(
  req: Request | NextRequest,
  category: RateLimitCategory = "standard",
  userId?: string
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[category];
  const now = Date.now();

  // Extract client IP address or user identifier
  let clientIdentifier = userId || "anonymous";

  if (!userId && "headers" in req) {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    clientIdentifier = forwarded?.split(",")[0]?.trim() || realIp || "127.0.0.1";
  }

  const key = `ratelimit:${category}:${clientIdentifier}`;
  const record = memoryStore.get(key);

  // If expired or not present, start a new window
  if (!record || now >= record.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  // Increment counter within current window
  record.count += 1;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

  if (record.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
  };
}

/**
 * Cleanup expired in-memory buckets periodically
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now >= record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000).unref();
}
