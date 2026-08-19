import { PgDialect } from 'drizzle-orm/pg-core'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Role = 'admin' | 'manager'
type Handler = (event: object) => Promise<unknown>

let statusHandler: Handler
let historyHandler: Handler
let activeHandler: Handler
let actorRole: Role = 'manager'

function queryBuilder(rows: unknown[], whereConditions: unknown[]) {
  const result = Promise.resolve(rows)
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn((condition: unknown) => {
      whereConditions.push(condition)
      return builder
    }),
    orderBy: vi.fn(() => result),
    then: result.then.bind(result),
  }
  builder.from.mockReturnValue(builder)
  builder.innerJoin.mockReturnValue(builder)
  return builder
}

function compiledParams(condition: unknown) {
  return new PgDialect().sqlToQuery(condition as Parameters<PgDialect['sqlToQuery']>[0]).params
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: Handler) => handler)
  ;[statusHandler, historyHandler, activeHandler] = await Promise.all([
    import('./status.get').then(module => module.default as Handler),
    import('./history.get').then(module => module.default as Handler),
    import('./active.get').then(module => module.default as Handler),
  ])
})

beforeEach(() => {
  actorRole = 'manager'
  vi.stubGlobal(
    'requireAppUser',
    vi.fn(async () => ({ profile: { role: actorRole } })),
  )
  vi.stubGlobal(
    'getQuery',
    vi.fn(() => ({
      start: '2026-08-01T00:00:00.000Z',
      end: '2026-09-01T00:00:00.000Z',
    })),
  )
})

describe('manager attendance query visibility', () => {
  it.each([
    ['status', () => statusHandler],
    ['history', () => historyHandler],
    ['active', () => activeHandler],
  ])('adds an admin-role exclusion to the %s query for managers', async (_name, getHandler) => {
    const whereConditions: unknown[] = []
    vi.stubGlobal('useDb', () => ({
      select: vi.fn(() => queryBuilder([], whereConditions)),
    }))

    await getHandler()({})

    expect(whereConditions).toHaveLength(1)
    expect(compiledParams(whereConditions[0])).toContain('admin')
  })

  it.each([
    ['status', () => statusHandler],
    ['history', () => historyHandler],
    ['active', () => activeHandler],
  ])(
    'does not exclude admin attendance from the %s query for admins',
    async (_name, getHandler) => {
      actorRole = 'admin'
      const whereConditions: unknown[] = []
      vi.stubGlobal('useDb', () => ({
        select: vi.fn(() => queryBuilder([], whereConditions)),
      }))

      await getHandler()({})

      expect(whereConditions).toHaveLength(1)
      expect(compiledParams(whereConditions[0])).not.toContain('admin')
    },
  )

  it('keeps the admin exclusion when a manager directly filters history by an admin userId', async () => {
    vi.stubGlobal(
      'getQuery',
      vi.fn(() => ({
        start: '2026-08-01T00:00:00.000Z',
        end: '2026-09-01T00:00:00.000Z',
        userId: '00000000-0000-4000-8000-000000000001',
      })),
    )
    const whereConditions: unknown[] = []
    vi.stubGlobal('useDb', () => ({
      select: vi.fn(() => queryBuilder([], whereConditions)),
    }))

    await historyHandler({})

    expect(compiledParams(whereConditions[0])).toEqual(
      expect.arrayContaining(['00000000-0000-4000-8000-000000000001', 'admin']),
    )
  })
})
