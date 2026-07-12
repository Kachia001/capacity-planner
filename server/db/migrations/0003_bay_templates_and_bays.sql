CREATE TABLE "bay_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bay_template_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"work_no" integer,
	"work_name" text,
	"work_detail" text,
	"vendor" text,
	"part_no" text,
	"item_name" text,
	"bolt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bays_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "bay_template_rows"
ADD CONSTRAINT "bay_template_rows_template_id_bay_templates_id_fk"
FOREIGN KEY ("template_id") REFERENCES "public"."bay_templates"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bay_template_rows_template_id_idx"
ON "bay_template_rows" USING btree ("template_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bay_template_rows_template_order_idx"
ON "bay_template_rows" USING btree ("template_id", "sort_order");
--> statement-breakpoint
INSERT INTO "bay_templates" (
	"id",
	"name",
	"description"
)
VALUES (
	'00000000-0000-4000-8000-000000000001',
	'기본 Manufacturing Daily List',
	'기존 BAY 공통 작업 목록에서 마이그레이션한 기본 템플릿입니다.'
);
--> statement-breakpoint
WITH "source_bay" AS (
	SELECT MIN("bay") AS "code"
	FROM "work_items"
),
"numbered_rows" AS (
	SELECT
		ROW_NUMBER() OVER (ORDER BY wi."source_row" NULLS LAST, wi."id")::integer AS "sort_order",
		wi."work_no",
		wi."work_name",
		wi."work_detail",
		wi."vendor",
		wi."part_no",
		wi."item_name",
		wi."bolt"
	FROM "work_items" wi
	INNER JOIN "source_bay" sb ON wi."bay" = sb."code"
)
INSERT INTO "bay_template_rows" (
	"template_id",
	"sort_order",
	"work_no",
	"work_name",
	"work_detail",
	"vendor",
	"part_no",
	"item_name",
	"bolt"
)
SELECT
	'00000000-0000-4000-8000-000000000001',
	"sort_order",
	"work_no",
	"work_name",
	"work_detail",
	"vendor",
	"part_no",
	"item_name",
	"bolt"
FROM "numbered_rows"
ORDER BY "sort_order";
--> statement-breakpoint
INSERT INTO "bays" ("code")
SELECT DISTINCT "bay"
FROM "work_items"
ORDER BY "bay";
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "bay_id" uuid;
--> statement-breakpoint
ALTER TABLE "work_items" ADD COLUMN "sort_order" integer;
--> statement-breakpoint
UPDATE "work_items" wi
SET "bay_id" = b."id"
FROM "bays" b
WHERE b."code" = wi."bay";
--> statement-breakpoint
WITH "ordered_items" AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "bay_id"
			ORDER BY "source_row" NULLS LAST, "id"
		)::integer AS "new_sort_order"
	FROM "work_items"
)
UPDATE "work_items" wi
SET "sort_order" = oi."new_sort_order"
FROM "ordered_items" oi
WHERE oi."id" = wi."id";
--> statement-breakpoint
ALTER TABLE "work_items" ALTER COLUMN "bay_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_items" ALTER COLUMN "sort_order" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "work_items_bay_source_row_idx";
--> statement-breakpoint
ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_bay_id_bays_id_fk"
FOREIGN KEY ("bay_id") REFERENCES "public"."bays"("id")
ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "work_items_bay_id_idx"
ON "work_items" USING btree ("bay_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_bay_order_idx"
ON "work_items" USING btree ("bay_id", "sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_bay_source_row_idx"
ON "work_items" USING btree ("bay_id", "source_row");
--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN "bay";
