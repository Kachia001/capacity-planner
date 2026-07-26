ALTER TABLE "work_items"
ADD COLUMN "issue_created_by" uuid;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_issue_created_by_app_users_auth_user_id_fk"
FOREIGN KEY ("issue_created_by")
REFERENCES "public"."app_users"("auth_user_id")
ON DELETE set null;

CREATE TABLE "telegram_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "bot_token_encrypted" text NOT NULL,
  "bot_token_last_four" text NOT NULL,
  "chat_id" text NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "telegram_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "telegram_settings_updated_by_app_users_auth_user_id_fk"
    FOREIGN KEY ("updated_by")
    REFERENCES "public"."app_users"("auth_user_id")
    ON DELETE set null
);
