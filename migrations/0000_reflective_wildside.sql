CREATE TABLE IF NOT EXISTS "automation" (
	"id" serial PRIMARY KEY NOT NULL,
	"default" boolean DEFAULT true,
	"status_column_id" text NOT NULL,
	"start_labels_array" text[] DEFAULT ARRAY[]::text[],
	"end_labels_array" text[] DEFAULT ARRAY[]::text[],
	"pause_labels_array" text[] DEFAULT ARRAY[]::text[],
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"days_array" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_subitem" boolean DEFAULT false,
	"parent_item_id" integer,
	"name" text NOT NULL,
	"board_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logConfigTable" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"subitem_id" integer,
	"start_date" timestamp DEFAULT now(),
	"complete" boolean DEFAULT false,
	"timer_start_date" timestamp,
	"automation_id" integer,
	"automate_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"total_hours" numeric(8, 2),
	"billable_hours" numeric(8, 2),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pauseLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_config_id" integer,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rateCards" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_per_hour" numeric(8, 2) DEFAULT 0,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"days_array" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_card_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logConfigTable" ADD CONSTRAINT "logConfigTable_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logConfigTable" ADD CONSTRAINT "logConfigTable_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logConfigTable" ADD CONSTRAINT "logConfigTable_automation_id_automation_id_fk" FOREIGN KEY ("automation_id") REFERENCES "automation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pauseLogs" ADD CONSTRAINT "pauseLogs_log_config_id_logConfigTable_id_fk" FOREIGN KEY ("log_config_id") REFERENCES "logConfigTable"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_rate_card_id_rateCards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "rateCards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
