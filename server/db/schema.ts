import { boolean, date, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const appRole = pgEnum('app_role', ['admin', 'manager', 'worker'])

export const appUsers = pgTable('app_users', {
  authUserId: uuid('auth_user_id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: appRole('role').notNull().default('worker'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bayTemplates = pgTable('bay_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  revision: integer('revision').notNull().default(1),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bayTemplateRows = pgTable(
  'bay_template_rows',
  {
    id: serial('id').primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => bayTemplates.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    workNo: integer('work_no'),
    workName: text('work_name'),
    workDetail: text('work_detail'),
    vendor: text('vendor'),
    partNo: text('part_no'),
    itemName: text('item_name'),
    bolt: text('bolt'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    templateIndex: index('bay_template_rows_template_id_idx').on(table.templateId),
    templateOrderUnique: uniqueIndex('bay_template_rows_template_order_idx').on(table.templateId, table.sortOrder),
  }),
)

export const bays = pgTable('bays', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workItems = pgTable(
  'work_items',
  {
    id: serial('id').primaryKey(),
    bayId: uuid('bay_id')
      .notNull()
      .references(() => bays.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull(),
    sourceRow: integer('source_row'),
    workNo: integer('work_no'),
    workName: text('work_name'),
    workDetail: text('work_detail'),
    vendor: text('vendor'),
    partNo: text('part_no'),
    itemName: text('item_name'),
    bolt: text('bolt'),
    hasIssue: boolean('has_issue').notNull().default(false),
    worker: text('worker'),
    workDate: date('work_date'),
    isCompleted: boolean('is_completed').notNull().default(false),
    issueNote: text('issue_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    bayIndex: index('work_items_bay_id_idx').on(table.bayId),
    bayOrderUnique: uniqueIndex('work_items_bay_order_idx').on(table.bayId, table.sortOrder),
    baySourceRowUnique: uniqueIndex('work_items_bay_source_row_idx').on(table.bayId, table.sourceRow),
  }),
)

export type WorkItem = typeof workItems.$inferSelect
export type NewWorkItem = typeof workItems.$inferInsert
export type AppUser = typeof appUsers.$inferSelect
export type NewAppUser = typeof appUsers.$inferInsert
export type Bay = typeof bays.$inferSelect
export type NewBay = typeof bays.$inferInsert
export type BayTemplate = typeof bayTemplates.$inferSelect
export type NewBayTemplate = typeof bayTemplates.$inferInsert
export type BayTemplateRow = typeof bayTemplateRows.$inferSelect
export type NewBayTemplateRow = typeof bayTemplateRows.$inferInsert
