import { z } from 'zod'
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { appUsers, bays, workItemIssues, workItems } from '../../../db/schema'

const bayIdSchema = z.string().uuid()
const workStatuses = ['not_started', 'in_progress', 'completed'] as const

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

function parseOptionalBoolean(value: unknown, name: string) {
  if (value === undefined) {
    return null
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw createError({ statusCode: 400, message: `${name} 필터 값이 올바르지 않습니다.` })
}

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager', 'worker'])
  const bayId = bayIdSchema.parse(getRouterParam(event, 'id'))
  const query = getQuery(event)
  const searchQuery = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  const requestedStatus = typeof query.status === 'string' ? query.status : ''
  const status = workStatuses.find(candidate => candidate === requestedStatus) ?? null
  const requestedWorkItemId = typeof query.workItemId === 'string' ? query.workItemId : ''
  const workItemId = requestedWorkItemId ? Number.parseInt(requestedWorkItemId, 10) : null

  if (requestedStatus && !status) {
    throw createError({ statusCode: 400, message: '작업 상태 필터가 올바르지 않습니다.' })
  }

  if (
    requestedWorkItemId &&
    (workItemId === null || !Number.isSafeInteger(workItemId) || workItemId <= 0)
  ) {
    throw createError({ statusCode: 400, message: '작업 항목 식별자가 올바르지 않습니다.' })
  }

  const highAltitude = parseOptionalBoolean(query.highAltitude, '고소작업')
  const hasIssue = parseOptionalBoolean(query.hasIssue, '이슈')
  const cursor = Math.max(
    0,
    Number.parseInt(typeof query.cursor === 'string' ? query.cursor : '0', 10) || 0,
  )
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(typeof query.limit === 'string' ? query.limit : '30', 10) || 30),
  )
  const db = useDb()
  const [bay] = await db
    .select({ id: bays.id, code: bays.code, description: bays.description })
    .from(bays)
    .where(and(eq(bays.id, bayId), eq(bays.status, 'active')))
    .limit(1)

  if (!bay) {
    throw createError({ statusCode: 404, message: 'BAY를 찾을 수 없습니다.' })
  }

  const conditions = [eq(workItems.bayId, bayId), isNull(workItems.voidedAt)]

  if (workItemId !== null) {
    conditions.push(eq(workItems.id, workItemId))
  }

  if (status) {
    conditions.push(eq(workItems.status, status))
  }

  if (highAltitude !== null) {
    conditions.push(eq(workItems.isHighAltitude, highAltitude))
  }

  if (hasIssue !== null) {
    const hasAnyIssue = sql<boolean>`exists (
      select 1
      from ${workItemIssues}
      where ${workItemIssues.workItemId} = ${workItems.id}
    )`
    conditions.push(hasIssue ? hasAnyIssue : sql<boolean>`not (${hasAnyIssue})`)
  }

  if (searchQuery) {
    const pattern = `%${escapeLikePattern(searchQuery)}%`
    conditions.push(
      or(
        ilike(workItems.workName, pattern),
        ilike(workItems.workDetail, pattern),
        ilike(workItems.vendor, pattern),
        ilike(workItems.partNo, pattern),
        ilike(workItems.itemName, pattern),
        ilike(workItems.bolt, pattern),
        ilike(workItems.safetyNote, pattern),
        sql`${workItems.workNo}::text ILIKE ${pattern}`,
      )!,
    )
  }

  const where = and(...conditions)
  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(workItems)
    .where(where)
  const total = countRow?.total ?? 0

  const rows = await db
    .select({
      id: workItems.id,
      bayId: workItems.bayId,
      sortOrder: workItems.sortOrder,
      sourceRow: workItems.sourceRow,
      workNo: workItems.workNo,
      workName: workItems.workName,
      workDetail: workItems.workDetail,
      vendor: workItems.vendor,
      partNo: workItems.partNo,
      itemName: workItems.itemName,
      bolt: workItems.bolt,
      status: workItems.status,
      startedBy: workItems.startedBy,
      startedAt: workItems.startedAt,
      completedBy: workItems.completedBy,
      completedAt: workItems.completedAt,
      worker: workItems.worker,
      isHighAltitude: workItems.isHighAltitude,
      safetyNote: workItems.safetyNote,
      version: workItems.version,
      updatedAt: workItems.updatedAt,
      startedByName: appUsers.displayName,
      startedByEmail: appUsers.email,
    })
    .from(workItems)
    .leftJoin(appUsers, eq(workItems.startedBy, appUsers.authUserId))
    .where(where)
    .orderBy(asc(workItems.sortOrder), asc(workItems.id))
    .limit(limit + 1)
    .offset(cursor)

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const itemIds = pageRows.map(row => row.id)
  const issueRows =
    itemIds.length > 0
      ? await db
          .select({
            id: workItemIssues.id,
            workItemId: workItemIssues.workItemId,
            category: workItemIssues.category,
            status: workItemIssues.status,
            note: workItemIssues.note,
            createdBy: workItemIssues.createdBy,
            createdByName: appUsers.displayName,
            createdByEmail: appUsers.email,
            statusUpdatedBy: workItemIssues.statusUpdatedBy,
            createdAt: workItemIssues.createdAt,
            updatedAt: workItemIssues.updatedAt,
            closedAt: workItemIssues.closedAt,
          })
          .from(workItemIssues)
          .leftJoin(appUsers, eq(workItemIssues.createdBy, appUsers.authUserId))
          .where(inArray(workItemIssues.workItemId, itemIds))
          .orderBy(desc(workItemIssues.createdAt), desc(workItemIssues.id))
      : []
  const issuesByWorkItem = new Map<number, typeof issueRows>()

  for (const issue of issueRows) {
    const issues = issuesByWorkItem.get(issue.workItemId) ?? []
    issues.push(issue)
    issuesByWorkItem.set(issue.workItemId, issues)
  }

  return {
    bay,
    items: pageRows.map(row => {
      const issues = issuesByWorkItem.get(row.id) ?? []

      return {
        ...row,
        hasIssue: issues.length > 0,
        openIssueCount: issues.filter(issue => issue.status !== 'resolved').length,
        issues,
      }
    }),
    total,
    nextCursor: hasMore ? String(cursor + limit) : null,
  }
})
