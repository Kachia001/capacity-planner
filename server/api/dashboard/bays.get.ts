import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  appUsers,
  bayPackingListRows,
  bayPackingListSections,
  bayPackingLists,
  bays,
  workItemIssues,
  workItems,
  workItemStatusEvents,
} from '../../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const db = useDb()

  const bayRows = await db
    .select({
      id: bays.id,
      code: bays.code,
      description: bays.description,
      tableNumber: bays.tableNumber,
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
      highAltitude: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null and ${workItems.isHighAltitude} = true
      )::int`,
      highAltitudeInProgress: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null
          and ${workItems.isHighAltitude} = true
          and ${workItems.status} = 'in_progress'
      )::int`,
      activeWorkers: sql<number>`count(distinct ${workItems.startedBy}) filter (
        where ${workItems.voidedAt} is null and ${workItems.status} = 'in_progress'
      )::int`,
      lastActivityAt: sql<Date | null>`max(${workItems.updatedAt}) filter (
        where ${workItems.voidedAt} is null
      )`,
    })
    .from(bays)
    .leftJoin(workItems, eq(workItems.bayId, bays.id))
    .where(eq(bays.status, 'active'))
    .groupBy(bays.id, bays.code, bays.description, bays.tableNumber)
    .orderBy(asc(bays.code))

  const packingRows = await db
    .select({
      bayId: bayPackingLists.bayId,
      totalRows: sql<number>`count(${bayPackingListRows.id})::int`,
      checkedRows: sql<number>`count(${bayPackingListRows.id}) filter (
        where ${bayPackingListRows.isChecked} = true
      )::int`,
    })
    .from(bayPackingLists)
    .leftJoin(bayPackingListSections, eq(bayPackingListSections.packingListId, bayPackingLists.id))
    .leftJoin(bayPackingListRows, eq(bayPackingListRows.sectionId, bayPackingListSections.id))
    .groupBy(bayPackingLists.bayId)
  const packingByBay = new Map(packingRows.map(row => [row.bayId, row]))
  const baySummaries = bayRows.map(row => {
    const packing = packingByBay.get(row.id)
    return {
      ...row,
      completionRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
      hasPackingList: Boolean(packing),
      packingProgress: packing
        ? calculatePackingProgress(packing.checkedRows, packing.totalRows)
        : null,
    }
  })
  const totals = baySummaries.reduce(
    (summary, bay) => {
      summary.totalItems += bay.total
      summary.notStarted += bay.notStarted
      summary.inProgress += bay.inProgress
      summary.completed += bay.completed
      summary.openIssues += bay.openIssues
      summary.highAltitudeInProgress += bay.highAltitudeInProgress

      if (bay.openIssues > 0) {
        summary.issueBays += 1
      }

      if (bay.total > 0 && bay.completed === bay.total) {
        summary.completeBays += 1
      } else {
        summary.openBays += 1
      }

      return summary
    },
    {
      totalBays: baySummaries.length,
      totalItems: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      openIssues: 0,
      issueBays: 0,
      openBays: 0,
      completeBays: 0,
      highAltitudeInProgress: 0,
    },
  )

  const [today = { startedToday: 0, completedToday: 0 }] = await db
    .select({
      startedToday: sql<number>`count(*) filter (
        where ${workItemStatusEvents.action} = 'start'
      )::int`,
      completedToday: sql<number>`count(*) filter (
        where ${workItemStatusEvents.action} = 'complete'
      )::int`,
    })
    .from(workItemStatusEvents)
    .where(sql`(${workItemStatusEvents.createdAt} at time zone 'Asia/Seoul')::date = CURRENT_DATE`)

  const issues = await db
    .select({
      id: workItemIssues.id,
      workItemId: workItems.id,
      bayId: bays.id,
      bayCode: bays.code,
      workName: workItems.workName,
      workDetail: workItems.workDetail,
      note: workItemIssues.note,
      category: workItemIssues.category,
      status: workItemIssues.status,
      createdAt: workItemIssues.createdAt,
      workerName: appUsers.displayName,
      workerEmail: appUsers.email,
      isHighAltitude: workItems.isHighAltitude,
    })
    .from(workItemIssues)
    .innerJoin(workItems, eq(workItemIssues.workItemId, workItems.id))
    .innerJoin(bays, eq(workItems.bayId, bays.id))
    .leftJoin(appUsers, eq(workItemIssues.createdBy, appUsers.authUserId))
    .where(and(isNull(workItems.voidedAt), sql`${workItemIssues.status} <> 'resolved'`))
    .orderBy(
      sql`CASE ${workItemIssues.status}
        WHEN 'unconfirmed' THEN 0
        WHEN 'in_review' THEN 1
        ELSE 2
      END`,
      asc(workItemIssues.createdAt),
    )

  const recentEvents = await db
    .select({
      id: workItemStatusEvents.id,
      workItemId: workItemStatusEvents.workItemId,
      bayId: bays.id,
      bayCode: bays.code,
      workName: workItems.workName,
      workDetail: workItems.workDetail,
      action: workItemStatusEvents.action,
      fromStatus: workItemStatusEvents.fromStatus,
      toStatus: workItemStatusEvents.toStatus,
      reason: workItemStatusEvents.reason,
      actorRole: workItemStatusEvents.actorRoleSnapshot,
      actorName: appUsers.displayName,
      actorEmail: appUsers.email,
      createdAt: workItemStatusEvents.createdAt,
    })
    .from(workItemStatusEvents)
    .innerJoin(workItems, eq(workItemStatusEvents.workItemId, workItems.id))
    .innerJoin(bays, eq(workItems.bayId, bays.id))
    .leftJoin(appUsers, eq(workItemStatusEvents.actorUserId, appUsers.authUserId))
    .orderBy(desc(workItemStatusEvents.createdAt))
    .limit(20)

  return {
    summary: {
      ...totals,
      startedToday: today.startedToday,
      completedToday: today.completedToday,
    },
    bays: baySummaries,
    issues,
    recentEvents,
    generatedAt: new Date(),
  }
})
