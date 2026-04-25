import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().min(1),
  AI_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().default("llama3.2:3b")
});

export const env = envSchema.parse(process.env);
