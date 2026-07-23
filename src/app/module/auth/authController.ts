import type { NextFunction, Request, Response } from "express";
import { signinSchema, signupSchema } from "./authValidation.js";
import { ApiError } from "../../common/utils/ApiError.js";
import * as authSerive from "./authService.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import {
  accessTokenOptions,
  refreshTokenOptions,
} from "../../common/utils/cookieOptions.js";
import { db } from "../../common/db/index.js";
import { usersTable } from "../../common/db/schema.js";
import { eq } from "drizzle-orm";

export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { data, error } = signupSchema.safeParse(req.body);

    if (error) {
      const errors = error.issues.map((err) => err.message);
      throw ApiError.badRequest(errors[0]);
    }

    const user = await authSerive.signupService(data);
    return ApiResponse.created(res, "account created successfully", { user });
  } catch (error) {
    next(error);
  }
}

export async function signinController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { data, error } = signinSchema.safeParse(req.body);

    if (error) {
      const errors = error.issues.map((err) => err.message);
      throw ApiError.badRequest(errors[0]);
    }

    const { accessToken, refreshToken, safeUser } =
      await authSerive.SigninService(data);

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    return ApiResponse.success(res, "logged in successfully", {
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    await authSerive.logoutService(userId!);

    res.clearCookie("accessToken", accessTokenOptions);
    res.clearCookie("refreshToken", refreshTokenOptions);

    return ApiResponse.success(res, "logged out successfully");
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token =
      req.cookies?.refreshToken ?? req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw ApiError.unauthorized("refresh token missing");
    }

    const { accessToken, refreshToken, safeUser } =
      await authSerive.refreshTokenService(token);

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    return ApiResponse.success(res, "token refreshed successfully", {
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}


export async function getMeController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user
    return ApiResponse.success(res, "user profile fetched successfully", {user})
  } catch (error) {
    next(error)
  }
}

