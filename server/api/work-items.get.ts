import { and, asc, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm'
import { bays, workItems } from '../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])

  const db = useDb()
  const query = getQuery(event)
  const selectedBay = typeof query.bay === 'string' && query.bay.trim() ? query.bay.trim() : null

  const totalCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null
  )::int`
  const notStartedCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null and ${workItems.status} = 'not_started'
  )::int`
  const inProgressCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null and ${workItems.status} = 'in_progress'
  )::int`
  const completedCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null and ${workItems.status} = 'completed'
  )::int`
  const issueCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null and ${workItems.hasIssue} = true
  )::int`
  const highAltitudeInProgressCount = sql<number>`count(${workItems.id}) filter (
    where ${workItems.voidedAt} is null
      and ${workItems.isHighAltitude} = true
      and ${workItems.status} = 'in_progress'
  )::int`

  const [
    summary = {
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      issues: 0,
      highAltitudeInProgress: 0,
    },
  ] = await db
    .select({
      total: totalCount,
      notStarted: notStartedCount,
      inProgress: inProgressCount,
      completed: completedCount,
      issues: issueCount,
      highAltitudeInProgress: highAltitudeInProgressCount,
    })
    .from(workItems)

  const bayRows = await db
    .select({
      bay: bays.code,
      id: bays.id,
      total: totalCount,
      notStarted: notStartedCount,
      inProgress: inProgressCount,
      completed: completedCount,
      issues: issueCount,
      highAltitudeInProgress: highAltitudeInProgressCount,
    })
    .from(bays)
    .leftJoin(workItems, eq(workItems.bayId, bays.id))
    .groupBy(bays.id, bays.code)
    .orderBy(asc(bays.code))

  const baySummaries = bayRows.map(row => ({
    ...row,
    completionRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
  }))

  const latest = await db
    .select({
      ...getTableColumns(workItems),
      bay: bays.code,
    })
    .from(workItems)
    .innerJoin(bays, eq(workItems.bayId, bays.id))
    .where(isNull(workItems.voidedAt))
    .orderBy(desc(workItems.updatedAt))
    .limit(20)
  const selectedBayItems = selectedBay
    ? await db
        .select({
          ...getTableColumns(workItems),
          bay: bays.code,
        })
        .from(workItems)
        .innerJoin(bays, eq(workItems.bayId, bays.id))
        .where(and(eq(bays.code, selectedBay), isNull(workItems.voidedAt)))
        .orderBy(asc(workItems.sortOrder), asc(workItems.id))
    : []

  return {
    summary,
    baySummaries,
    selectedBay,
    selectedBayItems,
    latest,
  }
})
