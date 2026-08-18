import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().max(65_535).default(4000),
  HOST: z.string().default("0.0.0.0"),
  BETTER_AUTH_SECRET: z.string().min(32),
  PASSWORD_PEPPER: z.string().min(32),
  CLIENT_ORIGIN: z.url(),
  APP_NAME: z.string(),
});

export const env = envSchema.parse(process.env);
