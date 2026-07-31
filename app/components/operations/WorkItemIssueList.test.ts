/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { OperationWorkItemIssue } from '@/types/operations'
import WorkItemIssueList from './WorkItemIssueList.vue'

const issue: OperationWorkItemIssue = {
  id: 41,
  workItemId: 4357,
  category: 'work_delay',
  status: 'unconfirmed',
  note: '후속 자재 입고까지 작업이 지연됩니다.',
  createdBy: 'bf83ac93-8ed3-41f8-b6a6-071e47dc40df',
  createdByName: '테스트 작업자',
  createdByEmail: 'worker@capacity-planner.local',
  statusUpdatedBy: null,
  statusUpdatedAt: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
}

describe('WorkItemIssueList permissions', () => {
  it('shows issue data but no edit controls to a worker', () => {
    const wrapper = mount(WorkItemIssueList, {
      props: {
        issues: [issue],
        canManage: false,
        pending: false,
      },
    })

    expect(wrapper.text()).toContain(issue.note)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('lets a manager request content and status changes', async () => {
    const wrapper = mount(WorkItemIssueList, {
      props: {
        issues: [issue],
        canManage: true,
        pending: false,
      },
    })

    await wrapper.get('button[aria-label="이슈 #41 내용 수정"]').trigger('click')
    await wrapper.get('select').setValue('in_review')

    expect(wrapper.emitted('editContent')).toEqual([[issue]])
    expect(wrapper.emitted('updateStatus')).toEqual([[41, 'in_review']])
  })
})
