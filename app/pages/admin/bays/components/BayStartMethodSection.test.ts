/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BayStartMethodSection from './BayStartMethodSection.vue'

describe('BayStartMethodSection', () => {
  it('offers work editing as a small action inside an existing option card', async () => {
    const wrapper = mount(BayStartMethodSection, {
      props: {
        templates: [
          {
            id: 'template-1',
            name: '기본 베이 옵션',
            description: '표준 작업 구성',
            sourceBay: '생성 옵션',
            updatedAtLabel: '2026. 7. 30.',
            usedByBayCount: 0,
            groups: [],
          },
        ],
        selectedTemplateId: 'direct-write',
        directWriteId: 'direct-write',
        loading: false,
        loadError: null,
        editingWorkConfiguration: true,
        templateCreatePath: '/admin/bay-templates/new',
      },
    })

    const editButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('작업 내용 변경 후 생성'))

    expect(editButton?.attributes('data-size')).toBe('xs')
    await editButton!.trigger('click')
    expect(wrapper.emitted('edit-template')).toEqual([['template-1']])
  })
})
