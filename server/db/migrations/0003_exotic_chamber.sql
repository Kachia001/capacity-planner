ALTER TABLE "work_item_issues" ADD COLUMN "closed_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "work_item_issues"
SET "closed_at" = COALESCE("status_updated_at", "updated_at", "created_at"),
    "updated_at" = COALESCE("status_updated_at", "updated_at", "created_at")
WHERE "status" = 'resolved';
