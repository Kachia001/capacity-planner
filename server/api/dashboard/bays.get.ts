import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { appUsers, bays, workItems, workItemStatusEvents } from '../../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const db = useDb()

  const bayRows = await db
    .select({
      id: bays.id,
      code: bays.code,
      description: bays.description,
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
      openIssues: sql<number>`count(${workItems.id}) filter (
        where ${workItems.voidedAt} is null
          and ${workItems.hasIssue} = true
          and (${workItems.issueStatus} is null or ${workItems.issueStatus} = 'open')
      )::int`,
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
    .groupBy(bays.id, bays.code, bays.description)
    .orderBy(asc(bays.code))

  const baySummaries = bayRows.map(row => ({
    ...row,
    completionRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
  }))
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
      id: workItems.id,
      bayId: bays.id,
      bayCode: bays.code,
      workName: workItems.workName,
      workDetail: workItems.workDetail,
      issueNote: workItems.issueNote,
      severity: workItems.issueSeverity,
      createdAt: workItems.issueCreatedAt,
      workerName: appUsers.displayName,
      workerEmail: appUsers.email,
      isHighAltitude: workItems.isHighAltitude,
    })
    .from(workItems)
    .innerJoin(bays, eq(workItems.bayId, bays.id))
    .leftJoin(appUsers, eq(workItems.startedBy, appUsers.authUserId))
    .where(
      and(
        isNull(workItems.voidedAt),
        eq(workItems.hasIssue, true),
        or(isNull(workItems.issueStatus), eq(workItems.issueStatus, 'open')),
      ),
    )
    .orderBy(
      sql`CASE ${workItems.issueSeverity}
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END`,
      asc(workItems.issueCreatedAt),
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
