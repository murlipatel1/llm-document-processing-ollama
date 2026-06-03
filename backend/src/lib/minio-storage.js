import { Client } from "minio";
import { env } from "../config/env.js";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY
});

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
  }
}

export async function uploadObject(key, buffer, mimeType) {
  await ensureBucket();
  await minioClient.putObject(env.MINIO_BUCKET, key, buffer, buffer.length, {
    "Content-Type": mimeType
  });
}

export async function deleteObject(key) {
  await minioClient.removeObject(env.MINIO_BUCKET, key);
}

export async function getObjectBuffer(key) {
  const stream = await minioClient.getObject(env.MINIO_BUCKET, key);
  const chunks = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
