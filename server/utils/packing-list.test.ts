import { describe, expect, it } from 'vitest'
import { calculatePackingProgress } from './packing-list'

describe('calculatePackingProgress', () => {
  it('returns zero for an empty packing list', () => {
    expect(calculatePackingProgress(0, 0)).toBe(0)
  })

  it('rounds checked rows into a percentage', () => {
    expect(calculatePackingProgress(2, 3)).toBe(67)
  })
})
