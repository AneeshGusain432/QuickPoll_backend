import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import {
  optionsTable,
  pollResponseTable,
  pollsTable,
  questionsAnswerTable,
  questionsTable,
  usersTable,
} from "../../common/db/schema.js";
import type { CreatePollInput, SubmitResponseInput } from "./pollValidation.js";
import { ApiError } from "../../common/utils/ApiError.js";
import e from "cors";
import { getIO } from "../../common/socket/socket.js";

export async function createpollService(data: CreatePollInput, userId: string) {
  const { title, description, questions, expiresAt, responseMode, status } =
    data;

  return db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(pollsTable)
      .values({
        title,
        description,
        creatorId: userId,
        status,
        expiresAt,
        responseMode,
      })
      .returning();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      const [question] = await tx
        .insert(questionsTable)
        .values({
          pollId: poll?.id!,
          question: q?.question!,
          orderIndex: i,
          priorityLevel: q?.priorityLevel,
          isMandatory: q?.isMandatory,
        })
        .returning();

      await tx.insert(optionsTable).values(
        q!?.options.map((optionText, idx) => ({
          questionId: question?.id!,
          option: optionText,
          orderIndex: idx,
        })),
      );
    }

    return poll;
  });
}

async function getpollwithStatus(pollId: string) {
  const [poll] = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.id, pollId));

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.status === "active" && poll.expiresAt < new Date()) {
    const [updatedPoll] = await db
      .update(pollsTable)
      .set({ status: "expired" })
      .where(eq(pollsTable.id, pollId))
      .returning();
    return updatedPoll;
  }

  return poll;
}

async function getQuestionsWithOptions(pollId: string) {
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.pollId, pollId))
    .orderBy(questionsTable.orderIndex);

  const questionIds = questions.map((q) => q.id);

  const options =
    questionIds.length > 0
      ? await db
          .select()
          .from(optionsTable)
          .where(inArray(optionsTable.questionId, questionIds))
          .orderBy(optionsTable.orderIndex)
      : [];

  return questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.questionId === q.id),
  }));
}

export async function getPollByIdService(pollId: string, userId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.creatorId !== userId) {
    throw ApiError.unauthorized("You do not have access to this poll");
  }

  const questions = await getQuestionsWithOptions(pollId);
  return { ...poll, questions };
}

export async function getpublicPollService(pollId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.status === "draft") {
    throw ApiError.notFound("Poll not found");
  }

  const questions = await getQuestionsWithOptions(pollId);

  if (poll.status === "published") {
    const questionsIds = questions.map((q) => q.id);
    const counts = await db
      .select({
        optionId: questionsAnswerTable.optionsId,
        count: sql<number>`count(*)::int`,
      })
      .from(questionsAnswerTable)
      .where(inArray(questionsAnswerTable.questionId, questionsIds))
      .groupBy(questionsAnswerTable.optionsId);

    const countMap = new Map(counts.map((c) => [c.optionId, c.count]));

    return {
      ...poll,
      questions: questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({
          ...o,
          count: countMap.get(o.id) ?? 0,
        })),
      })),
    };
  }

  return {
    ...poll,
    canRespond: poll.status === "active",
    questions,
  };
}

export async function publishedPollSerive(pollId: string, userId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.creatorId !== userId) {
    throw ApiError.unauthorized("You do not have access to this poll");
  }

  if (poll.status !== "expired") {
    throw ApiError.badRequest(
      "Only an expired poll can be published. This poll is currently: " +
        poll.status,
    );
  }

  const [updatedPoll] = await db
    .update(pollsTable)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pollsTable.id, pollId))
    .returning();

  // socket part
  getIO().to(`poll:${pollId}`).emit("poll:published", {
    pollId,
    status: "published",
  });

  return updatedPoll;
}

export async function deletePollService(pollId: string, userId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.creatorId !== userId) {
    throw ApiError.unauthorized("You do not have access to this poll");
  }

  return await db
    .delete(pollsTable)
    .where(eq(pollsTable.id, pollId))
    .returning();
}

export async function submitResposneService(
  pollId: string,
  input: SubmitResponseInput,
  respondentId: string | null,
  anonymousToken: string | null,
) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("poll not found");
  }

  if (poll.status !== "active") {
    throw ApiError.badRequest(
      poll.status === "expired"
        ? "This poll has expired and is no longer accepting responses"
        : "This poll is not currently accepting responses",
    );
  }

  if (poll.responseMode === "authenticated" && !respondentId) {
    throw ApiError.unauthorized(
      "You must be logged in to respond to this poll",
    );
  }

  if (poll.responseMode === "anonymous" && !anonymousToken) {
    throw ApiError.badRequest("Missing anonymous token");
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.pollId, pollId));

  const questionsIds = questions.map((q) => q.id);
  const options = await db
    .select()
    .from(optionsTable)
    .where(inArray(optionsTable.questionId, questionsIds));

  const answerMap = new Map(
    input.answers.map((a) => [a.questionId, a.optionId]),
  );

  const missingMandatory = questions.filter(
    (q) => q.isMandatory && !answerMap.has(q.id),
  );
  if (missingMandatory.length > 0) {
    throw ApiError.badRequest(
      `Missing answer for required question: "${missingMandatory[0]!.question}"`,
    );
  }

  for (const answer of input.answers) {
    const question = questions.find((q) => q.id === answer.questionId);

    if (!question) {
      throw ApiError.badRequest(`Unknown question: ${answer.questionId}`);
    }

    const option = options.find(
      (o) => o.id === answer.optionId && o.questionId === answer.questionId,
    );

    if (!option) {
      throw ApiError.badRequest(
        `Invalid option for question "${question.question}"`,
      );
    }
  }

  const response = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(pollResponseTable)
      .values({
        pollId,
        respondentId: respondentId ?? null,
        anonymousToken: respondentId ? null : anonymousToken,
      })
      .returning()
      .catch((err) => {
        throw ApiError.badRequest(`You have already responded to this poll`);
      });

    await tx.insert(questionsAnswerTable).values(
      input.answers.map((a) => ({
        responseId: inserted!.id,
        questionId: a.questionId,
        optionsId: a.optionId,
      })),
    );

    const [updatedPoll] = await db
      .update(pollsTable)
      .set({ responseCount: sql`${pollsTable.responseCount} + 1` })
      .where(eq(pollsTable.id, pollId))
      .returning();
    return {
      responseId: inserted!.id,
      responseCount: updatedPoll?.responseCount,
    };
  });

  // socket part
  getIO().to(`poll:${pollId}`).emit("poll:update", {
    pollId,
    responseCount: response.responseCount,
  });

  return response;
}

export async function getPollAnalyticsService(pollId: string, userId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("Poll not found");
  }

  if (poll.creatorId !== userId) {
    throw ApiError.unauthorized("You do not have access to this poll");
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.pollId, pollId));

  const questionsIds = questions.map((q) => q.id);

  if (questionsIds.length === 0) {
    return {
      pollId: poll.id,
      title: poll.title,
      description: poll?.description,
      status: poll.status,
      totalResponses: poll.responseCount,
      questions: [],
    };
  }

  let respondents: {
    id: string;
    name: string;
    email: string;
    submittedAt: Date;
  }[] = [];

  if (poll.responseMode === "authenticated") {
    respondents = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        submittedAt: pollResponseTable.submittedAt,
      })
      .from(pollResponseTable)
      .innerJoin(usersTable, eq(pollResponseTable.respondentId, usersTable.id))
      .where(eq(pollResponseTable.pollId, pollId))
      .orderBy(desc(pollResponseTable.submittedAt));
  }

  if (questionsIds.length === 0) {
    return {
      pollId: poll.id,
      title: poll.title,
      status: poll.status,
      responseMode: poll.responseMode,
      totalResponses: poll.responseCount,
      respondents,
      questions: [],
    };
  }

  const options = await db
    .select()
    .from(optionsTable)
    .where(inArray(optionsTable.questionId, questionsIds));

  const optionCounts = await db
    .select({
      optionId: questionsAnswerTable.optionsId,
      count: sql<number>`count (*) ::int`,
    })
    .from(questionsAnswerTable)
    .where(inArray(questionsAnswerTable.questionId, questionsIds))
    .groupBy(questionsAnswerTable.optionsId);

  const questionAnsweredCounts = await db
    .select({
      questionId: questionsAnswerTable.questionId,
      count: sql<number>`count(distinct ${questionsAnswerTable.responseId})::int`,
    })
    .from(questionsAnswerTable)
    .where(inArray(questionsAnswerTable.questionId, questionsIds))
    .groupBy(questionsAnswerTable.questionId);

  const optionCountMap = new Map(
    optionCounts.map((c) => [c.optionId, c.count]),
  );
  const answeredCountMap = new Map(
    questionAnsweredCounts.map((c) => [c.questionId, c.count]),
  );

  const questionsWithStats = questions.map((q) => {
    const questionOptions = options.filter((o) => o.questionId === q.id);
    const totalAnswered = answeredCountMap.get(q.id) ?? 0;

    const optionsWithStats = questionOptions.map((o) => {
      const count = optionCountMap.get(o.id) ?? 0;
      const percentage =
        totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;

      return {
        optionId: o.id,
        option: o.option,
        count,
        percentage,
      };
    });

    return {
      questionId: q.id,
      question: q.question,
      isMandatory: q.isMandatory,
      totalAnswered,
      skipped: Math.max(poll.responseCount - totalAnswered, 0),
      options: optionsWithStats,
    };
  });

  return {
    pollId: poll.id,
    title: poll.title,
    status: poll.status,
    responseMode: poll.responseMode,
    totalResponses: poll.responseCount,
    expiresAt: poll.expiresAt,
    respondents,
    questions: questionsWithStats,
  };
}

export async function getPollsListService(
  userId: string,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.creatorId, userId))
    .orderBy(desc(pollsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const polls = hasMore ? rows.slice(0, limit) : rows;

  const now = new Date();
  const expireIds = polls
    .filter((p) => p.status === "active" && p.expiresAt < now)
    .map((p) => p.id);

  if (expireIds.length > 0) {
    await db
      .update(pollsTable)
      .set({ status: "expired", updatedAt: now })
      .where(inArray(pollsTable.id, expireIds));
  }

  const result = polls.map((p) =>
    expireIds.includes(p.id) ? { ...p, status: "expired" as const } : p,
  );

  return {
    polls: result,
    nextPage: hasMore ? page + 1 : null,
  };
}

export async function livePollService(pollId: string, userId: string) {
  const poll = await getpollwithStatus(pollId);

  if (!poll) {
    throw ApiError.notFound("Poll not found");
  }

  if (poll.creatorId !== userId) {
    throw ApiError.unauthorized("You do not have access to this poll");
  }

  const livePoll = await db
    .update(pollsTable)
    .set({ status: "active" })
    .where(eq(pollsTable.id, pollId))
    .returning();
  return livePoll;
}

export async function getLivePollCount() {
  const poll = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.status, "active"));
  return poll.length;
}
