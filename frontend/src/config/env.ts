import { z } from 'zod';
import Constants from 'expo-constants';

const envSchema = z.object({
  API_BASE_URL: z.string().default('http://localhost:8001'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const extra = Constants.expoConfig?.extra ?? {};
const raw = {
  API_BASE_URL: extra.API_BASE_URL ?? process.env.API_BASE_URL,
  APP_ENV: extra.APP_ENV ?? process.env.APP_ENV,
};

export const env = envSchema.parse(raw);
export type EnvConfig = z.infer<typeof envSchema>;
