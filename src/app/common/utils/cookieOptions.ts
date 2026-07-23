import type {CookieOptions} from 'express'

export const accessTokenOptions: CookieOptions = {
  httpOnly: true,
  // signed: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:  process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 15 * 60 * 1000,
};

export const refreshTokenOptions: CookieOptions = {
  httpOnly: true,
  // signed: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:  process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60* 60* 1000,
} ;
