ALTER TABLE "logconfig" RENAME TO "automationconfig";--> statement-breakpoint
ALTER TABLE "automationconfig" DROP CONSTRAINT "logconfig_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "automationconfig" DROP CONSTRAINT "logconfig_rate_card_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automationconfig" ADD CONSTRAINT "automationconfig_rate_card_id_users_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
