CREATE TABLE "password_reset_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reset_by" uuid,
	"reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "password_reset_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "password_reset_by" uuid;--> statement-breakpoint
ALTER TABLE "password_reset_events" ADD CONSTRAINT "password_reset_events_user_id_app_users_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("auth_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_events" ADD CONSTRAINT "password_reset_events_reset_by_app_users_auth_user_id_fk" FOREIGN KEY ("reset_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_events_user_reset_idx" ON "password_reset_events" USING btree ("user_id","reset_at");--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_password_reset_by_app_users_auth_user_id_fk" FOREIGN KEY ("password_reset_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;