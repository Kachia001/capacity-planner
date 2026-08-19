import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAttendanceTargetAccess } from '../../../utils/attendance-policy'

type Handler = (event: object) => Promise<unknown>

let clockInHandler: Handler
let clockOutHandler: Handler
let patchSessionHandler: Handler
let deleteSessionHandler: Handler

const adminTarget = {
  authUserId: '00000000-0000-4000-8000-000000000001',
  role: 'admin' as const,
}
const managerProfile = {
  authUserId: '00000000-0000-4000-8000-000000000002',
  role: 'manager' as const,
}

function httpError(input: object) {
  return Object.assign(new Error('HTTP error'), input)
}

function selectBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  }
  builder.from.mockReturnValue(builder)
  builder.innerJoin.mockReturnValue(builder)
  builder.where.mockReturnValue(builder)
  return builder
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: Handler) => handler)
  ;[clockInHandler, clockOutHandler, patchSessionHandler, deleteSessionHandler] = await Promise.all(
    [
      import('./clock-in.post').then(module => module.default as Handler),
      import('./clock-out.post').then(module => module.default as Handler),
      import('./sessions/[id].patch').then(module => module.default as Handler),
      import('./sessions/[id].delete').then(module => module.default as Handler),
    ],
  )
})

beforeEach(() => {
  vi.stubGlobal('createError', httpError)
  vi.stubGlobal('requireAttendanceTargetAccess', requireAttendanceTargetAccess)
  vi.stubGlobal('requireAppUser', vi.fn().mockResolvedValue({ profile: managerProfile }))
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ userId: adminTarget.authUserId }))
  vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('41'))
})

describe('manager attendance command authorization', () => {
  it.each([
    ['clock-in', () => clockInHandler],
    ['clock-out', () => clockOutHandler],
  ])(
    'rejects direct admin userId on %s before starting a transaction',
    async (_name, getHandler) => {
      const transaction = vi.fn()
      vi.stubGlobal('useDb', () => ({
        query: { appUsers: { findFirst: vi.fn().mockResolvedValue(adminTarget) } },
        transaction,
      }))

      await expect(getHandler()({})).rejects.toMatchObject({
        statusCode: 403,
        data: { code: 'ATTENDANCE_ADMIN_TARGET_FORBIDDEN' },
      })
      expect(transaction).not.toHaveBeenCalled()
    },
  )

  it('rejects a known admin session ID on PATCH before updating it', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ startedAt: '2026-08-19T01:00:00.000Z' }))
    const update = vi.fn()
    const tx = {
      select: vi.fn(() =>
        selectBuilder([
          {
            id: 41,
            userId: adminTarget.authUserId,
            startedAt: new Date('2026-08-19T00:00:00.000Z'),
            endedAt: null,
            targetRole: 'admin',
          },
        ]),
      ),
      update,
    }
    vi.stubGlobal('useDb', () => ({
      transaction: (callback: (executor: typeof tx) => unknown) => callback(tx),
    }))

    await expect(patchSessionHandler({})).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'ATTENDANCE_ADMIN_TARGET_FORBIDDEN' },
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects a known admin session ID on DELETE before deleting it', async () => {
    const remove = vi.fn()
    const tx = {
      select: vi.fn(() => selectBuilder([{ userId: adminTarget.authUserId, role: 'admin' }])),
      delete: remove,
    }
    vi.stubGlobal('useDb', () => ({
      transaction: (callback: (executor: typeof tx) => unknown) => callback(tx),
    }))

    await expect(deleteSessionHandler({})).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'ATTENDANCE_ADMIN_TARGET_FORBIDDEN' },
    })
    expect(remove).not.toHaveBeenCalled()
  })
})
