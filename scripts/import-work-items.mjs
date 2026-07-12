import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

function readEnvFile(filePath) {
  return Object.fromEntries(
    readIfExists(filePath)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      }),
  )
}

function readIfExists(filePath) {
  try {
    return fsSync.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function normalizeRecord(record) {
  return {
    bay: record.bay,
    source_row: record.source_row,
    work_no: record.work_no,
    work_name: record.work_name,
    work_detail: record.work_detail,
    vendor: record.vendor,
    part_no: record.part_no,
    item_name: record.item_name,
    bolt: record.bolt,
    has_issue: Boolean(record.has_issue),
    worker: record.worker,
    work_date: record.work_date,
    is_completed: Boolean(record.is_completed),
    issue_note: record.issue_note,
  }
}

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/import-work-items.mjs <extracted-json>')
  process.exit(1)
}

const env = { ...readEnvFile(path.resolve('.env')), ...process.env }
const databaseUrl = env.NUXT_DATABASE_URL

if (!databaseUrl) {
  console.error('NUXT_DATABASE_URL is not configured.')
  process.exit(1)
}

const payload = JSON.parse(await fs.readFile(inputPath, 'utf8'))
const records = payload.records.map(normalizeRecord)

const sql = postgres(databaseUrl, { max: 5, prepare: false })

try {
  const bayRows = [...new Set(records.map(record => record.bay))].map(code => ({ code }))

  if (bayRows.length > 0) {
    await sql`
      insert into bays ${sql(bayRows)}
      on conflict (code) do nothing
    `
  }

  const storedBays = await sql`select id, code from bays`
  const bayIdByCode = new Map(storedBays.map(bay => [bay.code, bay.id]))
  const nextSortOrderByBay = new Map()
  const normalizedRecords = records.map(record => {
    const bayId = bayIdByCode.get(record.bay)
    if (!bayId) {
      throw new Error(`Could not resolve BAY: ${record.bay}`)
    }

    const sortOrder = (nextSortOrderByBay.get(record.bay) ?? 0) + 1
    nextSortOrderByBay.set(record.bay, sortOrder)

    const { bay: _bay, ...values } = record
    return {
      ...values,
      bay_id: bayId,
      sort_order: sortOrder,
    }
  })

  let insertedOrUpdated = 0

  for (const batch of chunk(normalizedRecords, 500)) {
    await sql`
      insert into work_items ${sql(batch)}
      on conflict (bay_id, source_row) do update set
        sort_order = excluded.sort_order,
        work_no = excluded.work_no,
        work_name = excluded.work_name,
        work_detail = excluded.work_detail,
        vendor = excluded.vendor,
        part_no = excluded.part_no,
        item_name = excluded.item_name,
        bolt = excluded.bolt,
        has_issue = excluded.has_issue,
        worker = excluded.worker,
        work_date = excluded.work_date,
        is_completed = excluded.is_completed,
        issue_note = excluded.issue_note,
        updated_at = now()
    `
    insertedOrUpdated += batch.length
  }

  const [summary] = await sql`
    select
      count(*)::int as total,
      count(*) filter (where has_issue)::int as issues,
      count(*) filter (where is_completed)::int as completed
    from work_items
  `
  const perBay = await sql`
    select b.code as bay, count(wi.id)::int as count
    from bays b
    left join work_items wi on wi.bay_id = b.id
    group by b.id, b.code
    order by b.code
  `

  console.log(JSON.stringify({ source: payload.source, imported: insertedOrUpdated, summary, perBay }, null, 2))
} finally {
  await sql.end()
}
