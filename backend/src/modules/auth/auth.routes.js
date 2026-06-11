import { loginHandler, logoutHandler, refreshHandler, registerHandler } from "./auth.controller.js";
import { loginBodySchema, registerBodySchema } from "./auth.schema.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createAuthRateLimit,
  loginFailureRateLimit
} from "../../middleware/authRateLimit.js";

import { env } from "../../config/env.js";

const loginIpLimit = createAuthRateLimit({
  max: env.AUTH_LOGIN_IP_MAX,
  keyPrefix: "auth:login:ip"
});
const registerIpLimit = createAuthRateLimit({
  max: env.AUTH_REGISTER_IP_MAX,
  keyPrefix: "auth:register:ip"
});
const refreshIpLimit = createAuthRateLimit({
  max: env.AUTH_REFRESH_IP_MAX,
  keyPrefix: "auth:refresh:ip"
});

export async function authRoutes(fastify) {
  fastify.post(
    "/register",
    { preHandler: [registerIpLimit], schema: { body: registerBodySchema } },
    registerHandler.bind(fastify)
  );
  fastify.post(
    "/login",
    {
      preHandler: [loginIpLimit, loginFailureRateLimit],
      schema: { body: loginBodySchema }
    },
    loginHandler.bind(fastify)
  );
  fastify.post(
    "/refresh",
    {
      preHandler: [refreshIpLimit],
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", minLength: 10 }
          }
        }
      }
    },
    refreshHandler.bind(fastify)
  );
  fastify.post(
    "/logout",
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", minLength: 10 }
          }
        }
      }
    },
    logoutHandler.bind(fastify)
  );
}
