import fp from "fastify-plugin";
import { ensureBucket, minioClient } from "../lib/minio-storage.js";

export const minioPlugin = fp(
  async (fastify) => {
    fastify.decorate("minio", minioClient);

    try {
      await ensureBucket();
      fastify.log.info("MinIO bucket ready");
    } catch (err) {
      fastify.log.warn({ err }, "MinIO not available — start with: npm run docker:infra");
    }
  },
  { name: "minio" }
);
