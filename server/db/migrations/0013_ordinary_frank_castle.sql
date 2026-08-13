CREATE TYPE "public"."application_log_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
CREATE TABLE "application_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"level" "application_log_level" NOT NULL,
	"category" text NOT NULL,
	"event" text,
	"message" text NOT NULL,
	"actor_user_id" uuid,
	"metadata" jsonb,
	"error_stack" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_logs" ADD CONSTRAINT "application_logs_actor_user_id_app_users_auth_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_logs_created_at_idx" ON "application_logs" USING btree ("created_at");