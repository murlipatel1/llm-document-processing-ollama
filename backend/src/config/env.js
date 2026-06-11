import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_SECRET_PREVIOUS: z
    .preprocess((val) => (val === "" || val === undefined ? undefined : val), z.string().min(16).optional()),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET_PREVIOUS: z
    .preprocess((val) => (val === "" || val === undefined ? undefined : val), z.string().min(16).optional()),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  AUTH_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(900),
  AUTH_LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_IP_MAX: z.coerce.number().int().positive().default(20),
  AUTH_REGISTER_IP_MAX: z.coerce.number().int().positive().default(10),
  AUTH_REFRESH_IP_MAX: z.coerce.number().int().positive().default(30),
  CHAT_HISTORY_MAX_AGE_DAYS: z.coerce.number().int().positive().default(90),
  MAX_EXTRACTED_TEXT_CHARS: z.coerce.number().int().positive().default(1_000_000),
  REDIS_URL: z.string().min(1),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_VECTOR_SIZE: z.coerce.number().int().positive().default(768),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_CHAT_MODEL: z.string().default("llama3.1:8b"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  // How many documents the worker processes in parallel.
  // Raise to match available CPU/GPU headroom; keep ≤ 2 on low-memory hosts.
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
