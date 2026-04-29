import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().min(1).optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INTERNAL_AUTH_TOKEN_SECRET: z.string().min(32),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  INTERNAL_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720),
  DEFAULT_CURRENCY: z.string().length(3).default("GBP"),
}).superRefine((env, ctx) => {
  if (!env.REDIS_URL && !(env.REDIS_HOST && env.REDIS_PORT)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide REDIS_URL or both REDIS_HOST and REDIS_PORT",
      path: ["REDIS_URL"],
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (rawEnv: NodeJS.ProcessEnv): AppEnv => envSchema.parse(rawEnv);

export const resolveRedisUrl = (env: AppEnv): string => {
  if (env.REDIS_URL) {
    return env.REDIS_URL;
  }

  const auth = env.REDIS_PASSWORD ? `:${env.REDIS_PASSWORD}@` : "";

  return `redis://${auth}${env.REDIS_HOST}:${env.REDIS_PORT}`;
};
