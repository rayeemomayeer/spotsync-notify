import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().default(3100),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("SpotSync <noreply@spotsync.local>"),
  INTERNAL_TOKEN: z.string().min(1),
  WEBHOOK_SECRET: z.string().default("change-me-webhook-secret"),
  WEBHOOK_URLS: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}
