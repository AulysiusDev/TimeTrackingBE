ALTER TABLE "ratecards" RENAME COLUMN "rate_per_hour" TO "rate";--> statement-breakpoint
ALTER TABLE "client_ratecards" ADD COLUMN "rate" numeric(8, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "client_ratecards" ADD COLUMN "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "rate" numeric(8, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "languages" text DEFAULT '[ENG]';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "timezone_offset" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "languages" text DEFAULT '[ENG]';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;