import { describe, expect, it } from 'vitest'
import { hashPassword, normalizeLoginEmail, verifyPassword } from './password'

describe('password utilities', () => {
  it('normalizes a local login ID to the internal email format', () => {
    expect(normalizeLoginEmail(' Worker01 ')).toBe('worker01@capacity-planner.local')
  })

  it('preserves and normalizes an email login ID', () => {
    expect(normalizeLoginEmail(' Admin@Example.COM ')).toBe('admin@example.com')
  })

  it('hashes and verifies a password with Argon2id', async () => {
    const passwordHash = await hashPassword('correct horse battery staple')

    expect(passwordHash).toMatch(/^\$argon2id\$/)
    await expect(verifyPassword(passwordHash, 'correct horse battery staple')).resolves.toBe(true)
    await expect(verifyPassword(passwordHash, 'wrong password')).resolves.toBe(false)
  })
})
