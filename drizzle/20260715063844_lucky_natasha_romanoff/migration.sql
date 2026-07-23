CREATE TYPE "poll_status" AS ENUM('draft', 'active', 'expired', 'published');--> statement-breakpoint
CREATE TYPE "priority_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "response_mode" AS ENUM('anonymous', 'authenticated');--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_id" uuid NOT NULL,
	"option" varchar(300),
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"respondent_id" uuid,
	"anonymous_token" varchar(100),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"creator_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(200),
	"status" "poll_status" DEFAULT 'draft'::"poll_status",
	"response_mode" "response_mode" DEFAULT 'authenticated'::"response_mode",
	"expires_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"response_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expires_after_created" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE TABLE "question_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"response_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"question" varchar(1000) NOT NULL,
	"order_index" integer NOT NULL,
	"priority_level" "priority_level" DEFAULT 'low'::"priority_level",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL UNIQUE,
	"password" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "options_question_idx" ON "options" ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "options_question_order_unique" ON "options" ("question_id","order_index");--> statement-breakpoint
CREATE INDEX "poll_responses_poll_idx" ON "poll_response" ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_responses_authenticated_dedupe" ON "poll_response" ("poll_id","respondent_id") WHERE "respondent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_responses_anonymous_dedupe" ON "poll_response" ("anonymous_token") WHERE "anonymous_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "poll_creator_idx" ON "polls" ("creator_id");--> statement-breakpoint
CREATE INDEX "poll_status_id" ON "polls" ("status");--> statement-breakpoint
CREATE INDEX "question_answers_response_idx" ON "question_answer" ("response_id");--> statement-breakpoint
CREATE INDEX "question_answers_question_option_idx" ON "question_answer" ("response_id","question_id");--> statement-breakpoint
CREATE INDEX "poll_questions_idx" ON "questions" ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_order_unique" ON "questions" ("order_index");--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_poll_id_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_respondent_id_users_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_creator_id_users_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question_answer" ADD CONSTRAINT "question_answer_response_id_poll_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "poll_response"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question_answer" ADD CONSTRAINT "question_answer_question_id_questions_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question_answer" ADD CONSTRAINT "question_answer_option_id_options_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_id_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE;