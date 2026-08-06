/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import DataTable from './DataTable.vue'

interface AccountRow {
  id: number
  name: string
  active: boolean
}

const columns = [
  { key: 'name', header: '이름', accessor: 'name' },
  { key: 'active', header: '상태', accessor: 'active' },
] as const

describe('DataTable', () => {
  it('renders data and allows a column-specific cell slot', () => {
    const wrapper = mount(DataTable<AccountRow>, {
      props: {
        columns,
        data: [{ id: 1, name: '관리자', active: true }],
        rowKey: 'id',
      },
      slots: {
        'cell-active': ({ row }: { row: AccountRow }) =>
          h('strong', { 'data-test': 'account-state' }, row.active ? '사용' : '중지'),
      },
    })

    expect(wrapper.text()).toContain('관리자')
    expect(wrapper.get('[data-test="account-state"]').text()).toBe('사용')
  })

  it('supports custom empty and loading areas', () => {
    const emptyWrapper = mount(DataTable<AccountRow>, {
      props: {
        columns,
        data: [],
      },
      slots: {
        empty: () => h('span', { 'data-test': 'empty' }, '계정이 없습니다.'),
      },
    })
    const loadingWrapper = mount(DataTable<AccountRow>, {
      props: {
        columns,
        data: [],
        loading: true,
      },
      slots: {
        loading: () => h('span', { 'data-test': 'loading' }, '계정 확인 중'),
      },
    })

    expect(emptyWrapper.get('[data-test="empty"]').text()).toBe('계정이 없습니다.')
    expect(loadingWrapper.get('[data-test="loading"]').text()).toBe('계정 확인 중')
  })

  it('applies row attributes derived from each row', async () => {
    let selectedId: number | null = null
    const wrapper = mount(DataTable<AccountRow>, {
      props: {
        columns,
        data: [{ id: 1, name: '관리자', active: true }],
        rowKey: 'id',
        options: {
          rowAttrs: row => ({
            tabindex: 0,
            'aria-label': `${row.name} 상세 보기`,
            onClick: () => {
              selectedId = row.id
            },
          }),
        },
      },
    })

    const row = wrapper.get('tbody tr')
    expect(row.attributes('tabindex')).toBe('0')
    expect(row.attributes('aria-label')).toBe('관리자 상세 보기')

    await row.trigger('click')
    expect(selectedId).toBe(1)
  })
})
