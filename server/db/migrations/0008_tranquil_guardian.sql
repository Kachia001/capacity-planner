CREATE TABLE "operation_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"operation_date" date NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"opened_by" uuid,
	"closed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operation_sessions" ADD CONSTRAINT "operation_sessions_opened_by_app_users_auth_user_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_sessions" ADD CONSTRAINT "operation_sessions_closed_by_app_users_auth_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operation_sessions_operation_date_idx" ON "operation_sessions" USING btree ("operation_date");--> statement-breakpoint
CREATE INDEX "operation_sessions_open_idx" ON "operation_sessions" USING btree ("closed_at");