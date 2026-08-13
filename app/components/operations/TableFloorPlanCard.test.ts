/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TableFloorPlanCard from './TableFloorPlanCard.vue'

describe('TableFloorPlanCard', () => {
  it('treats the displayed number as the table number and shows assigned BAY metrics', () => {
    const wrapper = mount(TableFloorPlanCard, {
      props: {
        numberLabel: '001',
        statusLabel: '이슈 2',
        table: {
          number: 1,
          bay: {
            id: '7bd7e35b-56a7-489c-adb1-d09f44163fe0',
            code: 'BAY-A01',
            description: null,
            total: 10,
            notStarted: 3,
            inProgress: 3,
            completed: 4,
            openIssues: 2,
            completionRate: 40,
          },
        },
      },
    })

    expect(wrapper.attributes('aria-label')).toBe('001번 테이블 상세 보기')
    expect(wrapper.text()).toContain('001')
    expect(wrapper.text()).toContain('BAY-A01')
    expect(wrapper.text()).toContain('이슈 2')
    expect(wrapper.text()).toContain('40%')
  })

  it('marks an empty table as unassigned', () => {
    const wrapper = mount(TableFloorPlanCard, {
      props: {
        numberLabel: '018',
        statusLabel: '미배치',
        table: { number: 18, bay: null },
      },
    })

    expect(wrapper.text()).toContain('018')
    expect(wrapper.text()).toContain('할당하기')
  })

  it('does not show an assignment action to read-only users', () => {
    const wrapper = mount(TableFloorPlanCard, {
      props: {
        numberLabel: '018',
        statusLabel: '미배치',
        table: { number: 18, bay: null },
        canManage: false,
      },
    })

    expect(wrapper.text()).toContain('미배치')
    expect(wrapper.text()).not.toContain('할당하기')
  })
})
