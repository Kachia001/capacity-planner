CREATE TABLE "work_tables" (
	"number" integer PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_tables_number_range" CHECK ("work_tables"."number" between 1 and 18)
);
--> statement-breakpoint
INSERT INTO "work_tables" ("number")
SELECT generate_series(1, 18);
--> statement-breakpoint
ALTER TABLE "bays" ADD COLUMN "table_number" integer;--> statement-breakpoint
ALTER TABLE "bays" ADD CONSTRAINT "bays_table_number_work_tables_number_fk" FOREIGN KEY ("table_number") REFERENCES "public"."work_tables"("number") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bays_table_number_idx" ON "bays" USING btree ("table_number");
