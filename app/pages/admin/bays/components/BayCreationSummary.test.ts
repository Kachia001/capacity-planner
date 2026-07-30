/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import BayCreationSummary from './BayCreationSummary.vue'

interface SummaryProps {
  groupCount: number
  itemCount: number
  highAltitudeCount: number
  selectedStartLabel: string
  hasSelectedStartMethod: boolean
  editingWorkConfiguration: boolean
  isDirectWrite: boolean
  submitError: string | null
  submitPending: boolean
  canSubmit: boolean
}

function mountSummary(overrides: Partial<SummaryProps> = {}) {
  const props: SummaryProps = {
    groupCount: 0,
    itemCount: 0,
    highAltitudeCount: 0,
    selectedStartLabel: '생성 옵션을 선택하세요',
    hasSelectedStartMethod: false,
    editingWorkConfiguration: false,
    isDirectWrite: false,
    submitError: null,
    submitPending: false,
    canSubmit: false,
    ...overrides,
  }

  return mount(
    defineComponent({
      setup() {
        return () =>
          h(TooltipProvider, null, {
            default: () => h(BayCreationSummary, props),
          })
      },
    }),
  )
}

describe('BayCreationSummary', () => {
  it('keeps the status area visible before selecting a creation option', () => {
    const wrapper = mountSummary()

    expect(wrapper.text()).toContain('생성 준비')
    expect(wrapper.text()).toContain('베이 생성 옵션을 선택하면 다음 단계로 진행할 수 있습니다.')
    expect(wrapper.get('button').attributes('aria-disabled')).toBe('true')
  })

  it('allows creating from an existing option without entering work editing', () => {
    const wrapper = mountSummary({
      groupCount: 3,
      itemCount: 12,
      selectedStartLabel: '표준 조립 공정',
      hasSelectedStartMethod: true,
      canSubmit: true,
    })

    expect(wrapper.text()).toContain(
      '선택한 생성 옵션을 그대로 사용하거나 작업 내용을 변경한 뒤 생성할 수 있습니다.',
    )
    expect(wrapper.get('button').attributes('aria-disabled')).toBeUndefined()
  })
})
