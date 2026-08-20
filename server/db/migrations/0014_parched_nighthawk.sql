CREATE TABLE "site_branding" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"active_logo_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_branding_singleton" CHECK ("site_branding"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "site_logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_logos_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "site_branding" ADD CONSTRAINT "site_branding_active_logo_id_site_logos_id_fk" FOREIGN KEY ("active_logo_id") REFERENCES "public"."site_logos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_branding" ADD CONSTRAINT "site_branding_updated_by_app_users_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_logos" ADD CONSTRAINT "site_logos_uploaded_by_app_users_auth_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."app_users"("auth_user_id") ON DELETE set null ON UPDATE no action;