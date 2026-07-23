import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { usersTable } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { comparePassword, hashPassword } from "../../common/utils/bcrypt.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../../common/utils/jwtToken.js";

interface signupData {
  name: string;
  email: string;
  password: string;
}

interface signinData {
  email: string;
  password: string;
}

async function sanitizeUser(user: any) {
  const { password, refreshToken, ...sanitizeUser } = user;
  return sanitizeUser;
}

export async function signupService(data: signupData) {
  const { name, email, password } = data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (user) {
    throw ApiError.conflict("user already exist with this email");
  }

  const hashedPassword = await hashPassword(password);

  const [createdUser] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashedPassword,
    })
    .returning();

  if (!createdUser) {
    throw ApiError.serverError("error while creating account");
  }

  const safeUser = await sanitizeUser(createdUser);
  return safeUser;
}

export async function SigninService(data: signinData) {
  const { email, password } = data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    throw ApiError.unauthorized("invalid email or password");
  }

  const valid = await comparePassword(password, user.password!);

  if (!valid) {
    throw ApiError.unauthorized("invalid email or password");
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
  const hashedRefreshToken = await hashToken(refreshToken);

  const [updatedUser] = await db
    .update(usersTable)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(usersTable.id, user.id))
    .returning();

  if (!updatedUser) {
    throw ApiError.serverError("error while updating user");
  }

  const safeUser = await sanitizeUser(updatedUser);

  return { accessToken, refreshToken, safeUser };
}

export async function logoutService(userId: string) {
  return await db
    .update(usersTable)
    .set({ refreshToken: null })
    .where(eq(usersTable.id, userId))
    .returning();
}

export async function refreshTokenService(token: string) {
  const decodedToken = verifyRefreshToken(token);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, decodedToken.id));

  if (!user) {
    throw ApiError.unauthorized("User account no longer exists");
  }

  const hashedRefreshToken = await hashToken(token);

  if (user?.refreshToken !== hashedRefreshToken) {
    throw ApiError.unauthorized("invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
  const newHashedRefreshToken = await hashToken(refreshToken);

  await db
    .update(usersTable)
    .set({ refreshToken: newHashedRefreshToken })
    .where(eq(usersTable.id, user.id));

  const safeUser = await sanitizeUser(user);
  return { accessToken, refreshToken, safeUser };
}
