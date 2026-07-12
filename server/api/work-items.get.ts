import { asc, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { bays, workItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  await requireAppUser(event)

  const db = useDb()
  const query = getQuery(event)
  const selectedBay = typeof query.bay === 'string' && query.bay.trim() ? query.bay.trim() : null

  const totalCount = sql<number>`count(${workItems.id})::int`
  const completedCount = sql<number>`count(*) filter (where ${workItems.isCompleted} = true)::int`
  const issueCount = sql<number>`count(*) filter (where ${workItems.hasIssue} = true)::int`

  const [summary = { total: 0, completed: 0, issues: 0 }] = await db
    .select({
      total: totalCount,
      completed: completedCount,
      issues: issueCount,
    })
    .from(workItems)

  const bayRows = await db
    .select({
      bay: bays.code,
      total: totalCount,
      completed: completedCount,
      issues: issueCount,
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
        .where(eq(bays.code, selectedBay))
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
