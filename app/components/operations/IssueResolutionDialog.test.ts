/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { OperationWorkItemIssue } from '@/types/operations'
import IssueResolutionDialog from './IssueResolutionDialog.vue'

const issue: OperationWorkItemIssue = {
  id: 41,
  workItemId: 4357,
  category: 'work_delay',
  status: 'in_review',
  note: '후속 자재 입고까지 작업이 지연됩니다.',
  resolutionNote: null,
  createdBy: null,
  createdByName: null,
  createdByEmail: null,
  statusUpdatedBy: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
  closedAt: null,
}

function mountDialog() {
  return mount(IssueResolutionDialog, {
    props: { issue, pending: false, errorMessage: null },
    global: { stubs: { Teleport: true } },
  })
}

describe('IssueResolutionDialog', () => {
  it('처리 내용을 작성하여 완료할 수 있다', async () => {
    const wrapper = mountDialog()

    await wrapper.get('textarea').setValue('  대체 자재로 교체했습니다.  ')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([['대체 자재로 교체했습니다.']])
  })

  it('처리 내용 없이도 완료할 수 있다', async () => {
    const wrapper = mountDialog()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([[null]])
  })
})
