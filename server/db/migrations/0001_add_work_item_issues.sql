CREATE TYPE "public"."work_item_issue_category" AS ENUM('material_shortage', 'work_delay', 'quality_issue', 'other');--> statement-breakpoint
CREATE TYPE "public"."work_item_issue_status" AS ENUM('unconfirmed', 'in_review', 'resolved');--> statement-breakpoint
CREATE TABLE "work_item_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_id" integer NOT NULL,
	"category" "work_item_issue_category" NOT NULL,
	"status" "work_item_issue_status" DEFAULT 'unconfirmed' NOT NULL,
	"note" text NOT NULL,
	"created_by" uuid,
	"status_updated_by" uuid,
	"status_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "work_item_issues" (
	"work_item_id",
	"category",
	"status",
	"note",
	"created_by",
	"status_updated_by",
	"status_updated_at",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	'other'::"work_item_issue_category",
	CASE
		WHEN "issue_status" = 'resolved' THEN 'resolved'::"work_item_issue_status"
		ELSE 'unconfirmed'::"work_item_issue_status"
	END,
	COALESCE(NULLIF(BTRIM("issue_note"), ''), '기존 이슈 내용 없음'),
	"issue_created_by",
	CASE WHEN "issue_status" = 'resolved' THEN "issue_resolved_by" ELSE NULL END,
	CASE WHEN "issue_status" = 'resolved' THEN "issue_resolved_at" ELSE NULL END,
	COALESCE("issue_created_at", "updated_at", "created_at"),
	COALESCE("issue_resolved_at", "issue_created_at", "updated_at", "created_at")
FROM "work_items"
WHERE "has_issue" = true;
--> statement-breakpoint
UPDATE "telegram_delivery_outbox"
SET "payload" = ("payload" - 'severity') || jsonb_build_object('category', 'other')
WHERE "payload" ? 'severity';
--> statement-breakpoint
ALTER TABLE "telegram_delivery_outbox" ADD COLUMN "issue_id" integer;--> statement-breakpoint
ALTER TABLE "work_item_issues" ADD CONSTRAINT "work_item_issues_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_issues" ADD CONSTRAINT "work_item_issues_created_by_app_users_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_item_issues" ADD CONSTRAINT "work_item_issues_status_updated_by_app_users_auth_user_id_fk" FOREIGN KEY ("status_updated_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_item_issues_item_status_idx" ON "work_item_issues" USING btree ("work_item_id","status");--> statement-breakpoint
CREATE INDEX "work_item_issues_created_idx" ON "work_item_issues" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "telegram_delivery_outbox" ADD CONSTRAINT "telegram_delivery_outbox_issue_id_work_item_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."work_item_issues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_delivery_outbox_issue_idx" ON "telegram_delivery_outbox" USING btree ("issue_id");
