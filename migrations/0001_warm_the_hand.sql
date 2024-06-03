ALTER TABLE "logConfigTable" RENAME TO "logconfig";--> statement-breakpoint
ALTER TABLE "pauseLogs" RENAME TO "pauselogs";--> statement-breakpoint
ALTER TABLE "rateCards" RENAME TO "ratecards";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_rate_card_id_rateCards_id_fk";
--> statement-breakpoint
ALTER TABLE "logconfig" DROP CONSTRAINT "logConfigTable_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "logconfig" DROP CONSTRAINT "logConfigTable_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "logconfig" DROP CONSTRAINT "logConfigTable_automation_id_automation_id_fk";
--> statement-breakpoint
ALTER TABLE "pauselogs" DROP CONSTRAINT "pauseLogs_log_config_id_logConfigTable_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_rate_card_id_ratecards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "ratecards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
 ALTER TABLE "logconfig" ADD CONSTRAINT "logconfig_automation_id_automation_id_fk" FOREIGN KEY ("automation_id") REFERENCES "automation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pauselogs" ADD CONSTRAINT "pauselogs_log_config_id_logconfig_id_fk" FOREIGN KEY ("log_config_id") REFERENCES "logconfig"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
