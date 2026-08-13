CREATE TABLE "attendance_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	CONSTRAINT "attendance_sessions_time_order_ck" CHECK ("attendance_sessions"."ended_at" is null or "attendance_sessions"."ended_at" >= "attendance_sessions"."started_at")
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_user_id_app_users_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("auth_user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_updated_by_user_id_app_users_auth_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."app_users"("auth_user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_user_open_uk" ON "attendance_sessions" USING btree ("user_id") WHERE "attendance_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "attendance_sessions_user_started_at_idx" ON "attendance_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);