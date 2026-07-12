CREATE TABLE "work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bay" text NOT NULL,
	"source_row" integer,
	"work_no" integer,
	"work_name" text,
	"work_detail" text,
	"vendor" text,
	"part_no" text,
	"item_name" text,
	"bolt" text,
	"has_issue" boolean DEFAULT false NOT NULL,
	"worker" text,
	"work_date" date,
	"is_completed" boolean DEFAULT false NOT NULL,
	"issue_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_bay_source_row_idx" ON "work_items" USING btree ("bay","source_row");