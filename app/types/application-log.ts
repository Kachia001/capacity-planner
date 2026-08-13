export type ApplicationLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ApplicationLogItem {
  id: string
  level: ApplicationLogLevel
  category: string
  event: string | null
  message: string
  actorUserId: string | null
  metadata: Record<string, unknown> | null
  errorStack: string | null
  createdAt: string
}

export interface ApplicationLogsResponse {
  items: ApplicationLogItem[]
  nextCursor: string | null
}

export interface ApplicationLogActor {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'manager' | 'worker'
  isActive: boolean
}

export interface ApplicationLogPurgeResponse {
  deletedCount: number
}
