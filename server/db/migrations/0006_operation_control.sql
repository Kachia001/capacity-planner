CREATE TABLE "operation_control" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "manual_closed_until" timestamp with time zone,
  "extension_until" timestamp with time zone,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "operation_control_singleton" CHECK ("id" = 1),
  CONSTRAINT "operation_control_updated_by_app_users_auth_user_id_fk"
    FOREIGN KEY ("updated_by")
    REFERENCES "public"."app_users"("auth_user_id")
    ON DELETE set null
);

INSERT INTO "operation_control" ("id")
VALUES (1)
ON CONFLICT ("id") DO NOTHING;
