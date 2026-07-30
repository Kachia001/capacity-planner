import { describe, expect, it } from 'vitest'
import { mapTemplateResponse } from './useBayTemplates'

function makeTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    sortOrder: 1,
    workNo: 10,
    workName: 'LOADLOCK',
    workDetail: '',
    vendor: '',
    partNo: '',
    itemName: '',
    bolt: '',
    isHighAltitude: false,
    safetyNote: '',
    ...overrides,
  }
}

describe('mapTemplateResponse', () => {
  it('preserves an existing empty option row as a legacy source row', () => {
    const result = mapTemplateResponse({
      id: 'template-1',
      name: '기본 베이 옵션',
      description: '',
      updatedAt: '2026-07-30T00:00:00.000Z',
      rows: [makeTemplateRow({ sortOrder: 7 })],
    })

    expect(result.groups[0]?.items[0]?.legacySourceRow).toBe(7)
  })

  it('keeps editable content rows subject to empty-row validation', () => {
    const result = mapTemplateResponse({
      id: 'template-1',
      name: '기본 베이 옵션',
      description: '',
      updatedAt: '2026-07-30T00:00:00.000Z',
      rows: [makeTemplateRow({ workDetail: '체결 상태 확인' })],
    })

    expect(result.groups[0]?.items[0]?.legacySourceRow).toBeNull()
  })
})
