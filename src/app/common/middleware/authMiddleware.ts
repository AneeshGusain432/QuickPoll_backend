import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwtToken.js";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import { eq, type InferSelectModel } from "drizzle-orm";

type User = InferSelectModel<typeof usersTable>;
type authenticateUser = Pick<
  User,
  "id" | "email" | "name" | "refreshToken" | "createdAt"
>;

declare global {
  namespace Express {
    interface Request {
      user?: authenticateUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token =
    req.cookies?.accessToken ?? req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw ApiError.unauthorized("Please log in to continue");
  }

  const decodedToken = verifyAccessToken(token);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, decodedToken.id));

  if (!user) {
    throw ApiError.unauthorized("User account no longer exists");
  }

  req.user = user;
  next();
}


