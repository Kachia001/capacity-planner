import { describe, expect, it } from 'vitest'
import {
  getErrorStack,
  sanitizeLogMetadata,
  sanitizeLogText,
  shouldCaptureApplicationError,
  writeApplicationLog,
} from './application-log'
import type { DatabaseExecutor } from '../infrastructure/database/database.types'

describe('application log sanitization', () => {
  it('redacts sensitive metadata recursively while preserving useful identifiers', () => {
    expect(
      sanitizeLogMetadata({
        targetUserId: 'user-1',
        temporaryPassword: 'do-not-store',
        nested: { access_token: 'do-not-store', attendanceSessionId: 10 },
      }),
    ).toEqual({
      targetUserId: 'user-1',
      temporaryPassword: '[민감정보 제거됨]',
      nested: { access_token: '[민감정보 제거됨]', attendanceSessionId: 10 },
    })
  })

  it('redacts credentials and bearer tokens from error stacks', () => {
    const error = new Error(
      'Bearer abc.def password=hunter2 postgres://logger:secret-value@localhost/app',
    )
    const stack = getErrorStack(error)

    expect(stack).not.toContain('abc.def')
    expect(stack).not.toContain('hunter2')
    expect(stack).not.toContain('secret-value')
  })

  it('redacts JSON, cookie, basic auth, API key, and query-string secrets', () => {
    const text = [
      '{"accessToken":"json-secret"}',
      'Cookie: sessionId=cookie-secret; theme=dark',
      'Authorization: Basic basic-secret',
      'X-Api-Key: api-secret',
      '/callback?token=query-secret&next=/home',
    ].join('\n')
    const sanitized = sanitizeLogText(text)

    for (const secret of [
      'json-secret',
      'cookie-secret',
      'basic-secret',
      'api-secret',
      'query-secret',
    ]) {
      expect(sanitized).not.toContain(secret)
    }
  })

  it('captures only server errors in the global error logger', () => {
    expect(shouldCaptureApplicationError(400)).toBe(false)
    expect(shouldCaptureApplicationError(401)).toBe(false)
    expect(shouldCaptureApplicationError(409)).toBe(false)
    expect(shouldCaptureApplicationError(500)).toBe(true)
    expect(shouldCaptureApplicationError(503)).toBe(true)
  })

  it('sanitizes messages and metadata immediately before persistence', async () => {
    const inserted: Record<string, unknown>[] = []
    const db = {
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          inserted.push(value)
        },
      }),
    } as unknown as DatabaseExecutor

    await writeApplicationLog(db, {
      level: 'info',
      category: 'test',
      message: 'token=message-secret 테스트 로그입니다.',
      metadata: { detail: '{"password":"metadata-secret"}' },
      errorStack: 'password=stack-secret',
    })

    expect(inserted).toEqual([
      expect.objectContaining({
        message: 'token=[민감정보 제거됨] 테스트 로그입니다.',
        metadata: { detail: '{"password":[민감정보 제거됨]}' },
        errorStack: null,
      }),
    ])
  })
})
