import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
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
