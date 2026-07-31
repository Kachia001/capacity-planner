ALTER TABLE "work_items" DROP CONSTRAINT "work_items_issue_created_by_app_users_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "work_items" DROP CONSTRAINT "work_items_issue_resolved_by_app_users_auth_user_id_fk";
--> statement-breakpoint
DROP INDEX "telegram_delivery_outbox_item_version_idx";--> statement-breakpoint
ALTER TABLE "telegram_delivery_outbox" ALTER COLUMN "issue_version" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "has_issue";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_status";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_severity";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_created_at";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_created_by";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_resolved_at";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_resolved_by";--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "issue_note";--> statement-breakpoint
DROP TYPE "public"."issue_severity";--> statement-breakpoint
DROP TYPE "public"."issue_status";