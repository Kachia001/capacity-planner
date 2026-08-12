import { describe, expect, it } from 'vitest'
import { clonePackingSections } from './usePackingLists'

describe('clonePackingSections', () => {
  it('creates an independent, sequential packing draft', () => {
    const source = [
      {
        clientId: 'section-old',
        sortOrder: 9,
        name: 'STOKER',
        memo: '',
        rows: [
          {
            clientId: 'row-old',
            sortOrder: 8,
            label: '본체 확인',
            isChecked: false,
            memo: '',
          },
        ],
      },
    ]

    const cloned = clonePackingSections(source)
    cloned[0]!.name = 'LOADPORT'

    expect(cloned[0]!.clientId).not.toBe(source[0]!.clientId)
    expect(cloned[0]!.rows[0]!.clientId).not.toBe(source[0]!.rows[0]!.clientId)
    expect(cloned[0]!.sortOrder).toBe(1)
    expect(cloned[0]!.rows[0]!.sortOrder).toBe(1)
    expect(source[0]!.name).toBe('STOKER')
  })
})
