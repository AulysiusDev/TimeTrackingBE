CREATE TABLE IF NOT EXISTS "automationconfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" text,
	"subitem_id" text,
	"board_id" text NOT NULL,
	"group_id" text,
	"workspace_id" text NOT NULL,
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
	"ratecard_id" integer,
	"client_id" integer,
	"category" text DEFAULT 'NB' NOT NULL,
	"rate_per_hour" numeric(8, 2),
	"currency" text DEFAULT 'USD',
	"active" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_ratecards" (
	"client_id" integer NOT NULL,
	"ratecard_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"industry" text,
	"access_key" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ratecard_id" integer NOT NULL,
	"client_id" integer,
	"item_id" text,
	"subitem_id" text,
	"board_id" text,
	"group_id" text,
	"workspace_id" text NOT NULL,
	"target_name" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"total_hours" numeric(8, 2),
	"billable_hours" numeric(8, 2),
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer,
	"rate_per_hour" numeric(8, 2) DEFAULT null,
	"currency" text DEFAULT null,
	"status" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_per_hour" numeric(8, 2) DEFAULT 0,
	"start_time" integer,
	"end_time" integer,
	"days_array" text,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_ratecards" (
	"user_id" integer NOT NULL,
	"ratecard_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"team" text,
	"access_key" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"timezone_offset" integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_automation_config_user_id" ON "automationconfig" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_client_ratecard" ON "client_ratecards" ("client_id","ratecard_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_client_ratecard_updated_by" ON "client_ratecards" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_updated_by" ON "clients" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_user_id" ON "logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_ratecard_id" ON "logs" ("ratecard_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_client_id" ON "logs" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_updated_by" ON "logs" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ratecards_updated_by" ON "ratecards" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_ratecard" ON "user_ratecards" ("user_id","ratecard_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_ratecard_updated_by" ON "user_ratecards" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_updated_by" ON "users" ("updated_by");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_ratecard_id_ratecards_id_fk" FOREIGN KEY ("ratecard_id") REFERENCES "ratecards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_ratecards" ADD CONSTRAINT "client_ratecards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_ratecards" ADD CONSTRAINT "client_ratecards_ratecard_id_ratecards_id_fk" FOREIGN KEY ("ratecard_id") REFERENCES "ratecards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_ratecards" ADD CONSTRAINT "client_ratecards_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_ratecard_id_ratecards_id_fk" FOREIGN KEY ("ratecard_id") REFERENCES "ratecards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratecards" ADD CONSTRAINT "ratecards_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ratecards" ADD CONSTRAINT "user_ratecards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ratecards" ADD CONSTRAINT "user_ratecards_ratecard_id_ratecards_id_fk" FOREIGN KEY ("ratecard_id") REFERENCES "ratecards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ratecards" ADD CONSTRAINT "user_ratecards_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
