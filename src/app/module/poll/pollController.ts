import type { NextFunction, Request, Response } from "express";
import { createPollSchema, submitResponseSchema } from "./pollValidation.js";
import { ApiError } from "../../common/utils/ApiError.js";
import * as pollService from "./pollService.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { randomUUID } from "crypto";
import { usersTable } from "../../common/db/schema.js";
import { eq } from "drizzle-orm";
import { verifyAccessToken } from "../../common/utils/jwtToken.js";
import { db } from "../../common/db/index.js";

export async function createpollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { data, error } = createPollSchema.safeParse(req.body);

    if (error) {
      const errors = error.issues.map((err) => err.message);
      throw ApiError.badRequest(errors[0]);
    }

    const userId = req.user?.id;

    const poll = await pollService.createpollService(data, userId!);

    return ApiResponse.created(res, "poll created successfully", poll);
  } catch (error) {
    next(error);
  }
}

export async function getPollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;
    const poll = await pollService.getPollByIdService(
      pollId as string,
      userId!,
    );
    return ApiResponse.success(res, "poll fetched successfully", { poll });
  } catch (error) {
    next(error);
  }
}

export async function getpublicPollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    let anonymousToken = req.cookies?.anonymousToken;

    if (!anonymousToken && !req.user) {
      anonymousToken = randomUUID();
      res.cookie("anonymousToken", anonymousToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }

    const poll = await pollService.getpublicPollService(pollId as string);

    return ApiResponse.success(res, "poll fetch successfully", { poll });
  } catch (error) {
    next(error);
  }
}

export async function publishPollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;
    const poll = await pollService.publishedPollSerive(
      pollId as string,
      userId!,
    );
    return ApiResponse.success(res, "poll published successfully", { poll });
  } catch (error) {
    next(error);
  }
}

export async function deletePollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;

    await pollService.deletePollService(pollId as string, userId!);
    return ApiResponse.success(res, "poll deleted successfully");
  } catch (error) {
    next(error);
  }
}

export async function submitResponseController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    let userId: string | null = null;
    const token =
      req.cookies?.accessToken ??
      req.headers.authorization?.split(" ")[1] ??
      null;

    if (token) {
      try {
        const decodedToken = verifyAccessToken(token);
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, decodedToken.id));

        if (user) {
          userId = user.id;
        }
      } catch {}
    }

    const anonymousToken = req.cookies?.anonymousToken ?? null;

    const { data, error } = submitResponseSchema.safeParse(req.body);

    if (error) {
      const errors = error.issues.map((err) => err.message);
      throw ApiError.badRequest(errors[0]);
    }

    const result = await pollService.submitResposneService(
      pollId as string,
      data,
      userId!,
      anonymousToken,
    );

    return ApiResponse.success(res, "poll submited successfully", {
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPollAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;

    const analytics = await pollService.getPollAnalyticsService(
      pollId as string,
      userId!,
    );
    return ApiResponse.success(res, "analytics fetched successfully", {
      analytics: analytics,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPollsListController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

    const polls = await pollService.getPollsListService(userId!, page, limit);
    ApiResponse.success(res, "polls fetched successfully", polls);
  } catch (error) {
    next(error);
  }
}

export async function livePollController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;

    const poll = await pollService.livePollService(pollId as string, userId!);
    return ApiResponse.success(res, "poll is now live", { poll });
  } catch (error) {
    next(error);
  }
}

export async function getLivePollCountController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const livePollCount = await pollService.getLivePollCount();
    return ApiResponse.success(res, "live poll count fetched", livePollCount);
  } catch (error) {
    next(error);
  }
}
