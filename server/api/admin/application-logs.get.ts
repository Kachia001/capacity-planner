import { and, desc, eq, gte, lt, lte, or, type SQL } from 'drizzle-orm'
import { applicationLogs } from '#server/db/schema'
import {
  applicationLogQuerySchema,
  formatApplicationLogCursor,
  hasValidApplicationLogRange,
  parseApplicationLogCursor,
} from '#server/utils/application-log-admin'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const parsed = applicationLogQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: '로그 조회 조건을 확인해 주세요.',
      data: { details: parsed.error.issues },
    })
  }

  const query = parsed.data
  const conditions: SQL[] = []
  if (query.level) conditions.push(eq(applicationLogs.level, query.level))
  if (query.category) conditions.push(eq(applicationLogs.category, query.category))
  if (query.event) conditions.push(eq(applicationLogs.event, query.event))
  if (query.actorUserId) conditions.push(eq(applicationLogs.actorUserId, query.actorUserId))
  if (query.from) conditions.push(gte(applicationLogs.createdAt, new Date(query.from)))
  if (query.to) conditions.push(lte(applicationLogs.createdAt, new Date(query.to)))
  if (!hasValidApplicationLogRange(query.from, query.to)) {
    throw createError({
      statusCode: 400,
      message: '조회 시작 시각은 종료 시각보다 늦을 수 없습니다.',
    })
  }

  if (query.cursor) {
    const cursor = parseApplicationLogCursor(query.cursor)
    if (!cursor) {
      throw createError({ statusCode: 400, message: '올바른 로그 커서가 필요합니다.' })
    }
    conditions.push(
      or(
        lt(applicationLogs.createdAt, cursor.createdAt),
        and(eq(applicationLogs.createdAt, cursor.createdAt), lt(applicationLogs.id, cursor.id)),
      )!,
    )
  }

  const rows = await useDb()
    .select()
    .from(applicationLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(applicationLogs.createdAt), desc(applicationLogs.id))
    .limit(query.limit + 1)
  const hasMore = rows.length > query.limit
  const items = hasMore ? rows.slice(0, query.limit) : rows
  const last = items.at(-1)

  return {
    items: items.map(log => ({
      ...log,
      id: log.id.toString(),
      createdAt: log.createdAt.toISOString(),
    })),
    nextCursor: hasMore && last ? formatApplicationLogCursor(last.createdAt, last.id) : null,
  }
})
