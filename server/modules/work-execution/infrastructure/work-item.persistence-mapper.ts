import { WorkItem } from '../domain/work-item'
import type { WorkItemProps } from '../domain/work-item.types'

export type WorkItemPersistenceRow = WorkItemProps

export class WorkItemPersistenceMapper {
  static toDomain(row: WorkItemPersistenceRow) {
    return WorkItem.reconstitute(row)
  }

  static toPersistence(workItem: WorkItem) {
    const snapshot = workItem.snapshot()

    return {
      status: snapshot.status,
      startedBy: snapshot.startedBy,
      startedAt: snapshot.startedAt,
      completedBy: snapshot.completedBy,
      completedAt: snapshot.completedAt,
      worker: snapshot.worker,
      workDate: snapshot.workDate,
      isCompleted: snapshot.isCompleted,
      version: snapshot.version,
      voidedBy: snapshot.voidedBy,
      voidedAt: snapshot.voidedAt,
      voidReason: snapshot.voidReason,
      updatedAt: snapshot.updatedAt,
    }
  }
}
