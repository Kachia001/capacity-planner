import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import { writeApplicationLog } from '#server/utils/application-log'
import type { ApplicationLogRepository } from '../repository/application-log.repository'

export class DrizzleApplicationLogRepository implements ApplicationLogRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  write(input: Parameters<typeof writeApplicationLog>[1]) {
    return writeApplicationLog(this.db, input)
  }
}
