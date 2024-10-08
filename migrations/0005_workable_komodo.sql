ALTER TABLE "ratecards" ALTER COLUMN "start_time" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "ratecards" ALTER COLUMN "start_time" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ratecards" ALTER COLUMN "end_time" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "ratecards" ALTER COLUMN "end_time" SET DEFAULT 0;