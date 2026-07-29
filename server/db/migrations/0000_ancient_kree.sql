CREATE TYPE "public"."app_role" AS ENUM('admin', 'manager', 'worker');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."telegram_delivery_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."work_item_event_action" AS ENUM('start', 'complete', 'cancel_start', 'void', 'restore');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "app_users" (
	"auth_user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"role" "app_role" DEFAULT 'worker' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"auth_version" integer DEFAULT 1 NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bay_template_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"work_no" integer,
	"work_name" text,
	"work_detail" text,
	"vendor" text,
	"part_no" text,
	"item_name" text,
	"bolt" text,
	"is_high_altitude" boolean DEFAULT false NOT NULL,
	"safety_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bay_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bays_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "operation_control" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"manual_closed_until" timestamp with time zone,
	"extension_until" timestamp with time zone,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operation_control_singleton" CHECK ("operation_control"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "telegram_delivery_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_id" integer NOT NULL,
	"issue_version" integer NOT NULL,
	"requested_by" uuid,
	"payload" jsonb NOT NULL,
	"status" "telegram_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"telegram_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"bot_token_encrypted" text NOT NULL,
	"bot_token_last_four" text NOT NULL,
	"chat_id" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_settings_singleton" CHECK ("telegram_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "work_item_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_id" integer NOT NULL,
	"from_status" "work_status" NOT NULL,
	"to_status" "work_status" NOT NULL,
	"action" "work_item_event_action" NOT NULL,
	"actor_user_id" uuid,
	"actor_role_snapshot" "app_role" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bay_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"source_row" integer,
	"work_no" integer,
	"work_name" text,
	"work_detail" text,
	"vendor" text,
	"part_no" text,
	"item_name" text,
	"bolt" text,
	"has_issue" boolean DEFAULT false NOT NULL,
	"issue_status" "issue_status",
	"issue_severity" "issue_severity",
	"issue_created_at" timestamp with time zone,
	"issue_created_by" uuid,
	"issue_resolved_at" timestamp with time zone,
	"issue_resolved_by" uuid,
	"status" "work_status" DEFAULT 'not_started' NOT NULL,
	"started_by" uuid,
	"started_at" timestamp with time zone,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"is_high_altitude" boolean DEFAULT false NOT NULL,
	"safety_note" text,
	"version" integer DEFAULT 0 NOT NULL,
	"voided_by" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"worker" text,
	"work_date" date,
	"is_completed" boolean DEFAULT false NOT NULL,
	"issue_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_created_by_app_users_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bay_template_rows" ADD CONSTRAINT "bay_template_rows_template_id_bay_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bay_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_control" ADD CONSTRAINT "operation_control_updated_by_app_users_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_delivery_outbox" ADD CONSTRAINT "telegram_delivery_outbox_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_delivery_outbox" ADD CONSTRAINT "telegram_delivery_outbox_requested_by_app_users_auth_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_settings" ADD CONSTRAINT "telegram_settings_updated_by_app_users_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_status_events" ADD CONSTRAINT "work_item_status_events_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_status_events" ADD CONSTRAINT "work_item_status_events_actor_user_id_app_users_auth_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_bay_id_bays_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."bays"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_issue_created_by_app_users_auth_user_id_fk" FOREIGN KEY ("issue_created_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_issue_resolved_by_app_users_auth_user_id_fk" FOREIGN KEY ("issue_resolved_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_started_by_app_users_auth_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_completed_by_app_users_auth_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_voided_by_app_users_auth_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bay_template_rows_template_id_idx" ON "bay_template_rows" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bay_template_rows_template_order_idx" ON "bay_template_rows" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_delivery_outbox_item_version_idx" ON "telegram_delivery_outbox" USING btree ("work_item_id","issue_version");--> statement-breakpoint
CREATE INDEX "telegram_delivery_outbox_dispatch_idx" ON "telegram_delivery_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "telegram_delivery_outbox_requested_by_created_idx" ON "telegram_delivery_outbox" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "work_item_status_events_item_created_idx" ON "work_item_status_events" USING btree ("work_item_id","created_at");--> statement-breakpoint
CREATE INDEX "work_item_status_events_created_idx" ON "work_item_status_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "work_items_bay_id_idx" ON "work_items" USING btree ("bay_id");--> statement-breakpoint
CREATE INDEX "work_items_bay_status_idx" ON "work_items" USING btree ("bay_id","status");--> statement-breakpoint
CREATE INDEX "work_items_bay_high_altitude_idx" ON "work_items" USING btree ("bay_id","is_high_altitude");--> statement-breakpoint
CREATE INDEX "work_items_started_by_status_idx" ON "work_items" USING btree ("started_by","status");--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_bay_order_idx" ON "work_items" USING btree ("bay_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_bay_source_row_idx" ON "work_items" USING btree ("bay_id","source_row");--> statement-breakpoint
INSERT INTO "operation_control" ("id") VALUES (1);
