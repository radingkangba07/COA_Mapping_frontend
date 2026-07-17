import { z } from 'zod';

const envSchema = z.object({
  API_BASE_URL: z.string().default('http://localhost:8001'),
  APP_ENV: z.enum(['development', 'staging', 'demo', 'production', 'testing']).default('development'),
});

const raw = {
  // Use ?? so an explicit empty string (deployed envs) is preserved as "" for
  // relative URL mode — nginx then proxies /api/ to the backend on the same host.
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? undefined,
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || undefined,
};

export const env = envSchema.parse(raw);
export type EnvConfig = z.infer<typeof envSchema>;
