CREATE TYPE "public"."telegram_delivery_status" AS ENUM (
  'pending',
  'processing',
  'sent',
  'failed',
  'skipped'
);

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
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "telegram_delivery_outbox_work_item_id_work_items_id_fk"
    FOREIGN KEY ("work_item_id")
    REFERENCES "public"."work_items"("id")
    ON DELETE restrict,
  CONSTRAINT "telegram_delivery_outbox_requested_by_app_users_auth_user_id_fk"
    FOREIGN KEY ("requested_by")
    REFERENCES "public"."app_users"("auth_user_id")
    ON DELETE set null
);

CREATE UNIQUE INDEX "telegram_delivery_outbox_item_version_idx"
ON "telegram_delivery_outbox" USING btree ("work_item_id", "issue_version");

CREATE INDEX "telegram_delivery_outbox_dispatch_idx"
ON "telegram_delivery_outbox" USING btree ("status", "next_attempt_at");

CREATE INDEX "telegram_delivery_outbox_requested_by_created_idx"
ON "telegram_delivery_outbox" USING btree ("requested_by", "created_at");
