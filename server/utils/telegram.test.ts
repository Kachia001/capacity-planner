import { describe, expect, it } from 'vitest'
import { decryptTelegramToken, encryptTelegramToken, maskTelegramToken } from './telegram-crypto'
import { formatTelegramIssueMessage } from './telegram'

const encryptionSecret = 'test-encryption-secret-with-at-least-32-characters'

describe('Telegram token encryption', () => {
  it('encrypts and decrypts a bot token without storing the original value', async () => {
    const token = '123456789:abcdefghijklmnopqrstuvwxyz_ABCDEFG'
    const encrypted = await encryptTelegramToken(token, encryptionSecret)

    expect(encrypted).not.toContain(token)
    await expect(decryptTelegramToken(encrypted, encryptionSecret)).resolves.toBe(token)
    expect(maskTelegramToken(token.slice(-4))).toBe('••••••••DEFG')
  })

  it('does not decrypt with a different encryption secret', async () => {
    const encrypted = await encryptTelegramToken(
      '123456789:abcdefghijklmnopqrstuvwxyz_ABCDEFG',
      encryptionSecret,
    )

    await expect(
      decryptTelegramToken(encrypted, 'another-encryption-secret-with-at-least-32-characters'),
    ).rejects.toThrow()
  })
})

describe('Telegram issue message', () => {
  it('includes the operational context and reporter without markup parsing', () => {
    const message = formatTelegramIssueMessage({
      bayCode: 'BAY-01',
      workItemId: 42,
      workNo: 10,
      workName: '프레임 조립',
      workDetail: '볼트 체결',
      partNo: 'P-100',
      isHighAltitude: true,
      severity: 'critical',
      note: '안전 난간이 흔들립니다.',
      reporterName: '홍길동',
      reporterRole: 'worker',
      createdAt: new Date('2026-07-26T01:00:00.000Z'),
    })

    expect(message).toContain('🚨 작업 이슈가 등록되었습니다')
    expect(message).toContain('Bay: BAY-01')
    expect(message).toContain('작업 ID: #42')
    expect(message).toContain('위험 구분: 고소작업')
    expect(message).toContain('심각도: 긴급')
    expect(message).toContain('등록자: 홍길동 (작업자)')
    expect(message).toContain('안전 난간이 흔들립니다.')
  })

  it('keeps the outbound message below the Telegram text limit', () => {
    const message = formatTelegramIssueMessage({
      bayCode: 'BAY-01',
      workItemId: 42,
      workNo: null,
      workName: '긴 작업명'.repeat(1000),
      workDetail: null,
      partNo: null,
      isHighAltitude: false,
      severity: 'medium',
      note: '긴 이슈 내용'.repeat(1000),
      reporterName: '작업자',
      reporterRole: 'worker',
      createdAt: new Date('2026-07-26T01:00:00.000Z'),
    })

    expect(message.length).toBeLessThanOrEqual(4000)
    expect(message.endsWith('…')).toBe(true)
  })
})
