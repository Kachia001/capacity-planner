import { asc, eq, sql } from 'drizzle-orm'
import { bays, workItems, workTables } from '../db/schema'

export async function getWorkTableOverview(db: ReturnType<typeof useDb>) {
  const rows = await db
    .select({
      number: workTables.number,
      bayId: bays.id,
      bayCode: bays.code,
      bayDescription: bays.description,
      total: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null
      )::int`,
      notStarted: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null and ${workItems.status} = 'not_started'
      )::int`,
      inProgress: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null and ${workItems.status} = 'in_progress'
      )::int`,
      completed: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null and ${workItems.status} = 'completed'
      )::int`,
      openIssues: sql<number>`(
        select count(*)::int
        from "work_item_issues" as issue
        inner join "work_items" as issue_item on issue_item."id" = issue."work_item_id"
        where issue_item."bay_id" = ${bays.id}
          and issue_item."voided_at" is null
          and issue."status" <> 'resolved'
      )`,
    })
    .from(workTables)
    .leftJoin(bays, eq(bays.tableNumber, workTables.number))
    .leftJoin(workItems, eq(workItems.bayId, bays.id))
    .where(eq(workTables.isActive, true))
    .groupBy(workTables.number, bays.id, bays.code, bays.description)
    .orderBy(asc(workTables.number))

  return rows.map(row => ({
    number: row.number,
    bay: row.bayId
      ? {
          id: row.bayId,
          code: row.bayCode!,
          description: row.bayDescription,
          total: row.total,
          notStarted: row.notStarted,
          inProgress: row.inProgress,
          completed: row.completed,
          openIssues: row.openIssues,
          completionRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
        }
      : null,
  }))
}
