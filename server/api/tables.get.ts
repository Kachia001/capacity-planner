import { getWorkTableOverview } from '../utils/work-tables'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager', 'worker'])
  const tables = await getWorkTableOverview(useDb())

  return {
    tables,
    summary: {
      totalTables: tables.length,
      assignedTables: tables.filter(table => table.bay).length,
      emptyTables: tables.filter(table => !table.bay).length,
      openIssues: tables.reduce((sum, table) => sum + (table.bay?.openIssues ?? 0), 0),
    },
  }
})
