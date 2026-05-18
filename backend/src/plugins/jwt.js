import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../config/env.js";

export const jwtPlugin = fp(
  async (fastify) => {
    await fastify.register(jwt, {
      secret: env.JWT_ACCESS_SECRET
    });
  },
  { name: "jwt" }
);
