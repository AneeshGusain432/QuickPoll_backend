import { sql } from "drizzle-orm";
import {
    boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const pollStatusEnum = pgEnum("poll_status", [
  "draft",
  "active",
  "expired",
  "published",
]);

export const responseModeEnum = pgEnum("response_mode", [
  "anonymous",
  "authenticated",
]);

export const priorityLevelEnum = pgEnum("priority_level", [
  "low",
  "medium",
  "high",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 ,}).notNull().unique(),
  refreshToken: varchar("refresh_token"),
  password: varchar("password", { length: 100 }),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const pollsTable = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 200 }),
    status: pollStatusEnum("status").default("draft"),
    responseMode: responseModeEnum("response_mode").default("authenticated"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    responseCount: integer("response_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    creatorIdx: index("poll_creator_idx").on(table.creatorId),
    statusIdx: index("poll_status_id").on(table.status),
    expiryCheck: check(
      "expires_after_created",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  }),
);

export const questionsTable = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 500 }).notNull(),
    orderIndex: integer("order_index").notNull(),
    priorityLevel: priorityLevelEnum("priority_level").default("low"),
     isMandatory: boolean("is_mandatory").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pollIdx: index("poll_questions_idx").on(table.pollId),
    pollOrderUnique: uniqueIndex("poll_order_unique").on(table.pollId ,table.orderIndex),
  }),
);

export const optionsTable = pgTable(
  "options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionsTable.id, { onDelete: "cascade" }),
    option: varchar("option", { length: 300 }),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    questionIdx: index("options_question_idx").on(table.questionId),
    questionOrderUnique: uniqueIndex("options_question_order_unique").on(
      table.questionId,
      table.orderIndex,
    ),
  }),
);

export const pollResponseTable = pgTable(
  "poll_response",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    respondentId: uuid("respondent_id").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    anonymousToken: varchar("anonymous_token", { length: 100 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pollIdx: index("poll_responses_poll_idx").on(table.pollId),

    authenticateDedupe: uniqueIndex("poll_responses_authenticated_dedupe")
      .on(table.pollId, table.respondentId)
      .where(sql`${table.respondentId} IS NOT NULL`),

    anonymousDedupe: uniqueIndex("poll_responses_anonymous_dedupe")
      .on(table.anonymousToken)
      .where(sql`${table.pollId, table.anonymousToken} IS NOT NULL`),
  }),
);

export const questionsAnswerTable = pgTable(
  "question_answer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => pollResponseTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionsTable.id, { onDelete: "cascade" }),
    optionsId: uuid("option_id")
      .notNull()
      .references(() => optionsTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    responseIdx: index("question_answers_response_idx").on(table.responseId),
    questionOptionIdx: index("question_answers_question_option_idx").on(
      table.responseId,
      table.questionId,
    ),
  }),
);
