ALTER TABLE "logconfig" RENAME COLUMN "target_id" TO "item_id";--> statement-breakpoint
ALTER TABLE "logconfig" ADD COLUMN "group_id" text;