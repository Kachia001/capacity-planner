import { describe, expect, it } from 'vitest'
import { canManageAccount } from './account-policy'

describe('canManageAccount', () => {
  it('allows admins to manage managers and workers', () => {
    expect(canManageAccount('admin', 'manager')).toBe(true)
    expect(canManageAccount('admin', 'worker')).toBe(true)
  })

  it('allows managers to manage workers only', () => {
    expect(canManageAccount('manager', 'worker')).toBe(true)
    expect(canManageAccount('manager', 'manager')).toBe(false)
    expect(canManageAccount('manager', 'admin')).toBe(false)
  })

  it('does not allow admin accounts or workers to manage accounts', () => {
    expect(canManageAccount('admin', 'admin')).toBe(false)
    expect(canManageAccount('worker', 'worker')).toBe(false)
  })
})
