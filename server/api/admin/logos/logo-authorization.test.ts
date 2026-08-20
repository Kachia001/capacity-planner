import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: object) => Promise<unknown>

let listHandler: Handler
let uploadHandler: Handler
let activateHandler: Handler
let deleteHandler: Handler

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: Handler) => handler)
  ;[listHandler, uploadHandler, activateHandler, deleteHandler] = await Promise.all([
    import('./index.get').then(module => module.default as Handler),
    import('./index.post').then(module => module.default as Handler),
    import('./[id]/activate.put').then(module => module.default as Handler),
    import('./[id].delete').then(module => module.default as Handler),
  ])
})

beforeEach(() => {
  vi.stubGlobal(
    'requireAppUser',
    vi.fn().mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        statusCode: 403,
      }),
    ),
  )
})

describe('logo management authorization', () => {
  it.each([
    ['list', () => listHandler],
    ['upload', () => uploadHandler],
    ['activate', () => activateHandler],
    ['delete', () => deleteHandler],
  ])('requires the admin role before handling %s', async (_name, getHandler) => {
    await expect(getHandler()({})).rejects.toMatchObject({ statusCode: 403 })
    expect(requireAppUser).toHaveBeenCalledWith({}, ['admin'])
  })
})
