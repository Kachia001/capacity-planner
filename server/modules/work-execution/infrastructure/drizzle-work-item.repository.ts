import { and, eq, isNull } from 'drizzle-orm'
import { bays, workItems } from '#server/db/schema'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import type { WorkItem } from '../domain/work-item'
import type { WorkItemRepository } from '../repository/work-item.repository'
import { ConcurrentWorkItemUpdateError } from '../service/errors/work-execution.errors'
import { WorkItemPersistenceMapper } from './work-item.persistence-mapper'

export class DrizzleWorkItemRepository implements WorkItemRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async findById(id: number) {
    const [row] = await this.db
      .select({
        id: workItems.id,
        bayCode: bays.code,
        workNo: workItems.workNo,
        workName: workItems.workName,
        workDetail: workItems.workDetail,
        partNo: workItems.partNo,
        isHighAltitude: workItems.isHighAltitude,
        status: workItems.status,
        startedBy: workItems.startedBy,
        startedAt: workItems.startedAt,
        completedBy: workItems.completedBy,
        completedAt: workItems.completedAt,
        worker: workItems.worker,
        workDate: workItems.workDate,
        isCompleted: workItems.isCompleted,
        version: workItems.version,
        voidedBy: workItems.voidedBy,
        voidedAt: workItems.voidedAt,
        voidReason: workItems.voidReason,
        hasIssue: workItems.hasIssue,
        issueStatus: workItems.issueStatus,
        issueSeverity: workItems.issueSeverity,
        issueNote: workItems.issueNote,
        issueCreatedAt: workItems.issueCreatedAt,
        issueCreatedBy: workItems.issueCreatedBy,
        issueResolvedAt: workItems.issueResolvedAt,
        issueResolvedBy: workItems.issueResolvedBy,
        updatedAt: workItems.updatedAt,
      })
      .from(workItems)
      .innerJoin(bays, eq(workItems.bayId, bays.id))
      .where(eq(workItems.id, id))
      .limit(1)

    return row ? WorkItemPersistenceMapper.toDomain(row) : null
  }

  async save(workItem: WorkItem) {
    const [updated] = await this.db
      .update(workItems)
      .set(WorkItemPersistenceMapper.toPersistence(workItem))
      .where(
        and(
          eq(workItems.id, workItem.id),
          eq(workItems.version, workItem.originalVersion),
          isNull(workItems.voidedAt),
        ),
      )
      .returning({ id: workItems.id })

    if (!updated) {
      throw new ConcurrentWorkItemUpdateError(workItem.id)
    }
  }
}
