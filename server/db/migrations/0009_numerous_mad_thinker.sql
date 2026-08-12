CREATE TABLE "bay_packing_list_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bay_packing_list_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"packing_list_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bay_packing_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bay_id" uuid NOT NULL,
	"memo" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_list_template_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_list_template_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_list_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bay_packing_list_rows" ADD CONSTRAINT "bay_packing_list_rows_section_id_bay_packing_list_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."bay_packing_list_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bay_packing_list_sections" ADD CONSTRAINT "bay_packing_list_sections_packing_list_id_bay_packing_lists_id_fk" FOREIGN KEY ("packing_list_id") REFERENCES "public"."bay_packing_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bay_packing_lists" ADD CONSTRAINT "bay_packing_lists_bay_id_bays_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."bays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_template_rows" ADD CONSTRAINT "packing_list_template_rows_section_id_packing_list_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."packing_list_template_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_template_sections" ADD CONSTRAINT "packing_list_template_sections_template_id_packing_list_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."packing_list_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bay_packing_rows_section_id_idx" ON "bay_packing_list_rows" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bay_packing_rows_order_idx" ON "bay_packing_list_rows" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE INDEX "bay_packing_sections_list_id_idx" ON "bay_packing_list_sections" USING btree ("packing_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bay_packing_sections_order_idx" ON "bay_packing_list_sections" USING btree ("packing_list_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "bay_packing_lists_bay_id_idx" ON "bay_packing_lists" USING btree ("bay_id");--> statement-breakpoint
CREATE INDEX "packing_template_rows_section_id_idx" ON "packing_list_template_rows" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packing_template_rows_order_idx" ON "packing_list_template_rows" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE INDEX "packing_template_sections_template_id_idx" ON "packing_list_template_sections" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packing_template_sections_order_idx" ON "packing_list_template_sections" USING btree ("template_id","sort_order");