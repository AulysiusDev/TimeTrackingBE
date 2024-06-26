CREATE TABLE IF NOT EXISTS "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_subitem" boolean DEFAULT false,
	"parent_item_id" integer,
	"board_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logconfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer,
	"subitem_id" integer,
	"start_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"people_column_id" text NOT NULL,
	"schedule" integer DEFAULT 0 NOT NULL,
	"custom" boolean DEFAULT false,
	"custom_days_array" text DEFAULT '[]',
	"default" boolean DEFAULT true,
	"status_column_id" text NOT NULL,
	"start_labels_array" text DEFAULT '[]',
	"end_labels_array" text DEFAULT '[]',
	"start_time" integer,
	"end_time" integer,
	"hours" numeric(8, 2),
	"name" text,
	"rate_card_id" integer,
	"rate_per_hour" numeric(8, 2),
	"currency" text DEFAULT 'USD',
	"board_id" text NOT NULL
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
	"created_at" timestamp DEFAULT now(),
	"rate_per_hour" numeric(8, 2) DEFAULT null,
	"currency" text DEFAULT null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_per_hour" numeric(8, 2) DEFAULT 0,
	"start_time" integer,
	"end_time" integer,
	"days_array" text,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logconfig" ADD CONSTRAINT "logconfig_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logconfig" ADD CONSTRAINT "logconfig_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logconfig" ADD CONSTRAINT "logconfig_rate_card_id_users_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
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
