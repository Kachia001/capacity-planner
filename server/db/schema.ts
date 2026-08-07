import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const appRole = pgEnum('app_role', ['admin', 'manager', 'worker'])
export const workStatus = pgEnum('work_status', ['not_started', 'in_progress', 'completed'])
export const workItemEventAction = pgEnum('work_item_event_action', [
  'start',
  'complete',
  'cancel_start',
  'void',
  'restore',
])
export const workItemIssueCategory = pgEnum('work_item_issue_category', [
  'material_shortage',
  'work_delay',
  'quality_issue',
  'other',
])
export const workItemIssueStatus = pgEnum('work_item_issue_status', [
  'unconfirmed',
  'in_review',
  'resolved',
])
export const telegramDeliveryStatus = pgEnum('telegram_delivery_status', [
  'pending',
  'processing',
  'sent',
  'failed',
  'skipped',
])

export const appUsers = pgTable('app_users', {
  authUserId: uuid('auth_user_id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  role: appRole('role').notNull().default('worker'),
  isActive: boolean('is_active').notNull().default(true),
  authVersion: integer('auth_version').notNull().default(1),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  passwordResetAt: timestamp('password_reset_at', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  passwordResetBy: uuid('password_reset_by').references((): AnyPgColumn => appUsers.authUserId, {
    onDelete: 'set null',
  }),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdBy: uuid('created_by').references((): AnyPgColumn => appUsers.authUserId, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const passwordResetEvents = pgTable(
  'password_reset_events',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.authUserId, { onDelete: 'cascade' }),
    resetBy: uuid('reset_by').references(() => appUsers.authUserId, { onDelete: 'set null' }),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull().defaultNow(),
    changedAt: timestamp('changed_at', { withTimezone: true }),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
  },
  table => ({
    userResetIndex: index('password_reset_events_user_reset_idx').on(table.userId, table.resetAt),
  }),
)

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
    isHighAltitude: boolean('is_high_altitude').notNull().default(false),
    safetyNote: text('safety_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    templateIndex: index('bay_template_rows_template_id_idx').on(table.templateId),
    templateOrderUnique: uniqueIndex('bay_template_rows_template_order_idx').on(
      table.templateId,
      table.sortOrder,
    ),
  }),
)

export const workTables = pgTable(
  'work_tables',
  {
    number: integer('number').primaryKey(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [check('work_tables_number_range', sql`${table.number} between 1 and 18`)],
)

export const bays = pgTable(
  'bays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    description: text('description'),
    tableNumber: integer('table_number').references(() => workTables.number, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    tableUnique: uniqueIndex('bays_table_number_idx').on(table.tableNumber),
  }),
)

export const operationControl = pgTable(
  'operation_control',
  {
    id: integer('id').primaryKey().default(1),
    manualClosedUntil: timestamp('manual_closed_until', { withTimezone: true }),
    extensionUntil: timestamp('extension_until', { withTimezone: true }),
    updatedBy: uuid('updated_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [check('operation_control_singleton', sql`${table.id} = 1`)],
)

export const operationSessions = pgTable(
  'operation_sessions',
  {
    id: text('id').primaryKey(),
    operationDate: date('operation_date').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    openedBy: uuid('opened_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    closedBy: uuid('closed_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    operationDateIndex: index('operation_sessions_operation_date_idx').on(table.operationDate),
    openSessionIndex: index('operation_sessions_open_idx').on(table.closedAt),
  }),
)

export const telegramSettings = pgTable(
  'telegram_settings',
  {
    id: integer('id').primaryKey().default(1),
    botTokenEncrypted: text('bot_token_encrypted').notNull(),
    botTokenLastFour: text('bot_token_last_four').notNull(),
    chatId: text('chat_id').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(true),
    updatedBy: uuid('updated_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [check('telegram_settings_singleton', sql`${table.id} = 1`)],
)

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
    status: workStatus('status').notNull().default('not_started'),
    startedBy: uuid('started_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    isHighAltitude: boolean('is_high_altitude').notNull().default(false),
    safetyNote: text('safety_note'),
    version: integer('version').notNull().default(0),
    voidedBy: uuid('voided_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    worker: text('worker'),
    workDate: date('work_date'),
    isCompleted: boolean('is_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    bayIndex: index('work_items_bay_id_idx').on(table.bayId),
    bayStatusIndex: index('work_items_bay_status_idx').on(table.bayId, table.status),
    bayHighAltitudeIndex: index('work_items_bay_high_altitude_idx').on(
      table.bayId,
      table.isHighAltitude,
    ),
    startedByStatusIndex: index('work_items_started_by_status_idx').on(
      table.startedBy,
      table.status,
    ),
    bayOrderUnique: uniqueIndex('work_items_bay_order_idx').on(table.bayId, table.sortOrder),
    baySourceRowUnique: uniqueIndex('work_items_bay_source_row_idx').on(
      table.bayId,
      table.sourceRow,
    ),
  }),
)

export const workItemIssues = pgTable(
  'work_item_issues',
  {
    id: serial('id').primaryKey(),
    workItemId: integer('work_item_id')
      .notNull()
      .references(() => workItems.id, { onDelete: 'restrict' }),
    category: workItemIssueCategory('category').notNull(),
    status: workItemIssueStatus('status').notNull().default('unconfirmed'),
    note: text('note').notNull(),
    resolutionNote: text('resolution_note'),
    createdBy: uuid('created_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    statusUpdatedBy: uuid('status_updated_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  table => ({
    workItemStatusIndex: index('work_item_issues_item_status_idx').on(
      table.workItemId,
      table.status,
    ),
    createdIndex: index('work_item_issues_created_idx').on(table.createdAt),
  }),
)

export const workItemStatusEvents = pgTable(
  'work_item_status_events',
  {
    id: serial('id').primaryKey(),
    workItemId: integer('work_item_id')
      .notNull()
      .references(() => workItems.id, { onDelete: 'restrict' }),
    fromStatus: workStatus('from_status').notNull(),
    toStatus: workStatus('to_status').notNull(),
    action: workItemEventAction('action').notNull(),
    actorUserId: uuid('actor_user_id').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    actorRoleSnapshot: appRole('actor_role_snapshot').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    workItemCreatedIndex: index('work_item_status_events_item_created_idx').on(
      table.workItemId,
      table.createdAt,
    ),
    createdIndex: index('work_item_status_events_created_idx').on(table.createdAt),
  }),
)

export const telegramDeliveryOutbox = pgTable(
  'telegram_delivery_outbox',
  {
    id: serial('id').primaryKey(),
    workItemId: integer('work_item_id')
      .notNull()
      .references(() => workItems.id, { onDelete: 'restrict' }),
    issueId: integer('issue_id').references(() => workItemIssues.id, { onDelete: 'restrict' }),
    legacyIssueVersion: integer('issue_version'),
    requestedBy: uuid('requested_by').references(() => appUsers.authUserId, {
      onDelete: 'set null',
    }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: telegramDeliveryStatus('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    lastErrorMessage: text('last_error_message'),
    telegramMessageId: text('telegram_message_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    issueUnique: uniqueIndex('telegram_delivery_outbox_issue_idx').on(table.issueId),
    dispatchIndex: index('telegram_delivery_outbox_dispatch_idx').on(
      table.status,
      table.nextAttemptAt,
    ),
    requestedByCreatedIndex: index('telegram_delivery_outbox_requested_by_created_idx').on(
      table.requestedBy,
      table.createdAt,
    ),
  }),
)

export type WorkItem = typeof workItems.$inferSelect
export type NewWorkItem = typeof workItems.$inferInsert
export type WorkItemIssue = typeof workItemIssues.$inferSelect
export type NewWorkItemIssue = typeof workItemIssues.$inferInsert
export type WorkItemStatusEvent = typeof workItemStatusEvents.$inferSelect
export type NewWorkItemStatusEvent = typeof workItemStatusEvents.$inferInsert
export type AppUser = typeof appUsers.$inferSelect
export type NewAppUser = typeof appUsers.$inferInsert
export type PasswordResetEvent = typeof passwordResetEvents.$inferSelect
export type Bay = typeof bays.$inferSelect
export type NewBay = typeof bays.$inferInsert
export type WorkTable = typeof workTables.$inferSelect
export type OperationControl = typeof operationControl.$inferSelect
export type OperationSession = typeof operationSessions.$inferSelect
export type TelegramSettings = typeof telegramSettings.$inferSelect
export type TelegramDeliveryOutbox = typeof telegramDeliveryOutbox.$inferSelect
export type BayTemplate = typeof bayTemplates.$inferSelect
export type NewBayTemplate = typeof bayTemplates.$inferInsert
export type BayTemplateRow = typeof bayTemplateRows.$inferSelect
export type NewBayTemplateRow = typeof bayTemplateRows.$inferInsert
