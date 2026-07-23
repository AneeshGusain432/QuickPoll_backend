DROP INDEX "poll_order_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "poll_order_unique" ON "questions" ("poll_id","order_index");