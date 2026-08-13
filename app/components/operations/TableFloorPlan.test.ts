/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TableFloorPlan from './TableFloorPlan.vue'

describe('TableFloorPlan', () => {
  it('renders all 18 clickable table cards in the desktop layout', () => {
    const tables = Array.from({ length: 18 }, (_, index) => ({
      number: index + 1,
      bay: null,
    }))
    const wrapper = mount(TableFloorPlan, { props: { tables } })
    const desktop = wrapper.get('[data-layout="desktop"]')

    expect(desktop.findAll('button')).toHaveLength(18)
    expect(desktop.text()).toContain('001')
    expect(desktop.text()).toContain('018')
    expect(desktop.text()).toContain('BAY할당하기')
  })

  it('emits the selected table number', async () => {
    const tables = Array.from({ length: 18 }, (_, index) => ({
      number: index + 1,
      bay: null,
    }))
    const wrapper = mount(TableFloorPlan, { props: { tables } })
    await wrapper.get('[aria-label="001번 테이블 상세 보기"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[1]])
  })

  it('describes empty tables as unassigned for read-only users', () => {
    const tables = Array.from({ length: 18 }, (_, index) => ({
      number: index + 1,
      bay: null,
    }))
    const wrapper = mount(TableFloorPlan, { props: { tables, canManage: false } })

    expect(wrapper.text()).toContain('미배치')
    expect(wrapper.text()).not.toContain('할당하기')
  })
})
