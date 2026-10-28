import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  KEY_ENCRYPTION_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
});

export function readEnv() {
  return envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI,
    AUTH_SECRET: process.env.AUTH_SECRET,
    KEY_ENCRYPTION_SECRET: process.env.KEY_ENCRYPTION_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    REDIS_URL: process.env.REDIS_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    APP_BASE_URL: process.env.APP_BASE_URL,
  });
}

export function describeIntegrationStatus() {
  const env = readEnv();
  return {
    mongodb: Boolean(env.MONGODB_URI),
    auth: Boolean(env.AUTH_SECRET),
    openai: Boolean(env.OPENAI_API_KEY),
    redis: Boolean(env.REDIS_URL),
    email: Boolean(env.RESEND_API_KEY),
    jobProviders: true,
  };
}
