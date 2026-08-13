import type { ApplicationLogInput } from '#server/utils/application-log'

export interface ApplicationLogRepository {
  write(input: ApplicationLogInput): Promise<void>
}
