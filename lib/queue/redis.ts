import Redis, { RedisOptions } from "ioredis";

let redisInstance: Redis | null = null;
let isRedisConnecting = false;
let lastConnectionAttempt = 0;
let connectionFailed = false;

const RETRY_INTERVAL_MS = 30000; // Do not spam connection attempts if Redis is offline

/**
 * Returns Redis configuration options optimized for BullMQ with graceful degradation.
 */
export function getRedisConfig(): RedisOptions {
  return {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
    disconnectTimeout: 2000,
    retryStrategy(times) {
      if (times > 3) {
        connectionFailed = true;
        return null; // Stop retrying automatically to avoid hanging the app
      }
      return Math.min(times * 1000, 3000);
    },
    reconnectOnError(err) {
      const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNREFUSED"];
      return targetErrors.some((code) => err.message.includes(code));
    },
  };
}

/**
 * Retrieves the shared Redis client instance.
 * Gracefully returns null if Redis is not reachable or unconfigured.
 */
export async function getRedisClient(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL;

  // If no REDIS_URL is configured, return null immediately without network delay
  if (!redisUrl) {
    return null;
  }

  // If connection previously failed, throttle retries
  if (connectionFailed && Date.now() - lastConnectionAttempt < RETRY_INTERVAL_MS) {
    return null;
  }

  if (redisInstance && redisInstance.status === "ready") {
    return redisInstance;
  }

  if (isRedisConnecting) {
    return null;
  }

  isRedisConnecting = true;
  lastConnectionAttempt = Date.now();

  try {
    const config = getRedisConfig();
    const client = redisUrl ? new Redis(redisUrl, config) : new Redis(config);

    client.on("error", (err) => {
      // Log connection error without crashing process
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[Redis] Connection warning: ${err.message}`);
      }
      connectionFailed = true;
    });

    await client.connect().catch((err) => {
      connectionFailed = true;
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[Redis] Failed to connect: ${err.message}`);
      }
    });

    if (client.status === "ready" || client.status === "connect") {
      redisInstance = client;
      connectionFailed = false;
      return redisInstance;
    }

    return null;
  } catch (err: unknown) {
    connectionFailed = true;
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[Redis] Error initializing Redis client: ${msg}`);
    }
    return null;
  } finally {
    isRedisConnecting = false;
  }
}

/**
 * Checks if Redis is currently connected and responsive.
 */
export async function isRedisConnected(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const ping = await client.ping();
    return ping === "PONG";
  } catch {
    return false;
  }
}

/**
 * Closes Redis connection cleanly (used during shutdown and testing).
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
    connectionFailed = false;
  }
}
