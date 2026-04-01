import { z } from 'zod';

const envSchema = z.object({
  API_BASE_URL: z.string().min(1).default('http://localhost:8001'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'testing']).default('development'),
});

const raw = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || undefined,
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || undefined,
};

export const env = envSchema.parse(raw);
export type EnvConfig = z.infer<typeof envSchema>;
