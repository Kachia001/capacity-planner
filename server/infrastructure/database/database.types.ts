import type { useDb } from '#server/utils/db'

export type Database = ReturnType<typeof useDb>
export type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type DatabaseExecutor = Database | DatabaseTransaction
