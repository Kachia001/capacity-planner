CREATE TYPE "public"."work_status" AS ENUM ('not_started', 'in_progress', 'completed');
--> statement-breakpoint
CREATE TYPE "public"."work_item_event_action" AS ENUM ('start', 'complete', 'cancel_start', 'void');
--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM ('open', 'resolved');
--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM ('low', 'medium', 'high', 'critical');
--> statement-breakpoint
ALTER TABLE "bay_template_rows" ADD COLUMN "is_high_altitude" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "bay_template_rows" ADD COLUMN "safety_note" text;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "issue_status" "issue_status";
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "issue_severity" "issue_severity";
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "issue_created_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "issue_resolved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "issue_resolved_by" uuid;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "status" "work_status" DEFAULT 'not_started' NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "started_by" uuid;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "completed_by" uuid;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "is_high_altitude" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "safety_note" text;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "voided_by" uuid;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "voided_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "void_reason" text;
--> statement-breakpoint
UPDATE "work_items"
SET
  "status" = CASE
    WHEN "is_completed" = true THEN 'completed'::"work_status"
    WHEN "worker" IS NOT NULL OR "work_date" IS NOT NULL THEN 'in_progress'::"work_status"
    ELSE 'not_started'::"work_status"
  END,
  "started_at" = CASE
    WHEN "is_completed" = true OR "worker" IS NOT NULL OR "work_date" IS NOT NULL
      THEN COALESCE("work_date"::timestamp AT TIME ZONE 'Asia/Seoul', "updated_at", "created_at")
    ELSE NULL
  END,
  "completed_at" = CASE
    WHEN "is_completed" = true
      THEN COALESCE("work_date"::timestamp AT TIME ZONE 'Asia/Seoul', "updated_at", "created_at")
    ELSE NULL
  END,
  "issue_status" = CASE WHEN "has_issue" = true THEN 'open'::"issue_status" ELSE NULL END,
  "issue_severity" = CASE WHEN "has_issue" = true THEN 'medium'::"issue_severity" ELSE NULL END,
  "issue_created_at" = CASE WHEN "has_issue" = true THEN COALESCE("updated_at", "created_at") ELSE NULL END;
--> statement-breakpoint
ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_issue_resolved_by_app_users_auth_user_id_fk"
FOREIGN KEY ("issue_resolved_by") REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_started_by_app_users_auth_user_id_fk"
FOREIGN KEY ("started_by") REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_completed_by_app_users_auth_user_id_fk"
FOREIGN KEY ("completed_by") REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_voided_by_app_users_auth_user_id_fk"
FOREIGN KEY ("voided_by") REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "work_items_bay_status_idx" ON "work_items" USING btree ("bay_id", "status");
--> statement-breakpoint
CREATE INDEX "work_items_bay_high_altitude_idx" ON "work_items" USING btree ("bay_id", "is_high_altitude");
--> statement-breakpoint
CREATE INDEX "work_items_started_by_status_idx" ON "work_items" USING btree ("started_by", "status");
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
ALTER TABLE "work_item_status_events"
ADD CONSTRAINT "work_item_status_events_work_item_id_work_items_id_fk"
FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id")
ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "work_item_status_events"
ADD CONSTRAINT "work_item_status_events_actor_user_id_app_users_auth_user_id_fk"
FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "work_item_status_events_item_created_idx"
ON "work_item_status_events" USING btree ("work_item_id", "created_at");
--> statement-breakpoint
CREATE INDEX "work_item_status_events_created_idx"
ON "work_item_status_events" USING btree ("created_at");
