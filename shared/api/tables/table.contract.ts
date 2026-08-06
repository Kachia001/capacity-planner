export interface TableBaySummary {
  id: string
  code: string
  description: string | null
  total: number
  notStarted: number
  inProgress: number
  completed: number
  openIssues: number
  completionRate: number
}

export interface WorkTableOverview {
  number: number
  bay: TableBaySummary | null
}

export interface WorkTablesResponse {
  tables: WorkTableOverview[]
  summary: {
    totalTables: number
    assignedTables: number
    emptyTables: number
    openIssues: number
  }
}

export interface AssignTableBayRequest {
  bayId: string | null
}

