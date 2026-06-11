import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ACCESS_SECRETS = [env.JWT_ACCESS_SECRET, env.JWT_ACCESS_SECRET_PREVIOUS].filter(Boolean);

/**
 * Verify an access token, accepting the current secret and an optional
 * previous secret during rotation grace periods.
 */
export function verifyAccessToken(token) {
  let lastError;

  for (const secret of ACCESS_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Invalid token");
}

/**
 * Sign a refresh token with the dedicated refresh secret.
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
}

/**
 * Verify a refresh token against current and optional previous refresh secrets.
 */
export function verifyRefreshToken(token) {
  const secrets = [env.JWT_REFRESH_SECRET, env.JWT_REFRESH_SECRET_PREVIOUS].filter(Boolean);
  let lastError;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Invalid refresh token");
}
