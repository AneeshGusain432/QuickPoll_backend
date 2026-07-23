import Jwt from "jsonwebtoken";
import crypto from "crypto";
import { ApiError } from "./ApiError.js";
type tokenPayload = {
  id: string;
  email: string;
};

export function generateAccessToken(payload: tokenPayload) {
  return Jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY as "15m",
  });
}

export function generateRefreshToken(payload: tokenPayload) {
  return Jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY as "7d",
  });
}

export async function hashToken(token: string) {
  return await crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string) {
  try {
    return Jwt.verify(
      token,
      process.env.JWT_ACCESS_TOKEN_SECRET!,
    ) as tokenPayload;
  } catch (error) {
    throw ApiError.unauthorized("invalid or expire access token");
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return Jwt.verify(
      token,
      process.env.JWT_REFRESH_TOKEN_SECRET!,
    ) as tokenPayload;
  } catch (error) {
    throw ApiError.unauthorized("invalid or expire refresh token");
  }
}
