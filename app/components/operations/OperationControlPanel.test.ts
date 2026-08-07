/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { OperationStatus } from '@/types/operations'
import OperationControlPanel from './OperationControlPanel.vue'

const closedOutsideRegularHours: OperationStatus = {
  isOpen: false,
  mode: 'closed',
  isWithinRegularHours: false,
  regularOpensAt: '2026-07-30T23:20:00.000Z',
  regularClosesAt: '2026-07-30T08:20:00.000Z',
  closesAt: null,
  nextRegularOpensAt: '2026-07-30T23:20:00.000Z',
  serverNow: '2026-07-30T09:00:00.000Z',
  timeZone: 'Asia/Seoul',
}

function mountPanel(status: OperationStatus = closedOutsideRegularHours) {
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(TooltipProvider, null, {
            default: () =>
              h(OperationControlPanel, {
                status,
                canManage: true,
                pending: false,
                mutationPending: false,
              }),
          })
      },
    }),
  )

  return {
    wrapper,
    panel: wrapper.getComponent(OperationControlPanel),
  }
}

function getButtonByText(mounted: ReturnType<typeof mountPanel>, text: string) {
  const button = mounted.wrapper
    .findAll('button')
    .find(candidate => candidate.text().includes(text))
  if (!button) throw new Error(`${text} 버튼을 찾을 수 없습니다.`)
  return button
}

afterEach(() => {
  vi.useRealTimers()
})

describe('OperationControlPanel extension controls', () => {
  it('offers 30 minutes, 60 minutes, and custom end-time choices', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T09:00:00.000Z'))
    const mounted = mountPanel()

    expect(getButtonByText(mounted, '30분').exists()).toBe(true)
    expect(getButtonByText(mounted, '60분').exists()).toBe(true)
    expect(getButtonByText(mounted, '직접 입력').exists()).toBe(true)

    mounted.wrapper.unmount()
  })

  it('emits the selected preset duration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T09:00:00.000Z'))
    const mounted = mountPanel()

    await getButtonByText(mounted, '30분').trigger('click')
    await getButtonByText(mounted, '연장 Open').trigger('click')

    expect(mounted.panel.emitted('open')).toEqual([[{ extensionMinutes: 30 }]])
    mounted.wrapper.unmount()
  })

  it('emits a Seoul custom end time as an ISO timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T09:00:00.000Z'))
    const mounted = mountPanel()

    await getButtonByText(mounted, '직접 입력').trigger('click')
    expect(
      mounted.wrapper.get('input[aria-label="종료 시"]').element.previousElementSibling
        ?.textContent,
    ).toBe('시')
    expect(
      mounted.wrapper.get('input[aria-label="종료 분"]').element.previousElementSibling
        ?.textContent,
    ).toBe('분')

    await mounted.wrapper.get('input[aria-label="종료 날짜"]').setValue('2026-07-30')
    await mounted.wrapper.get('input[aria-label="종료 시"]').setValue('20')
    await mounted.wrapper.get('input[aria-label="종료 분"]').setValue('15')
    await getButtonByText(mounted, '연장 Open').trigger('click')

    expect(mounted.panel.emitted('open')).toEqual([
      [{ extensionUntil: '2026-07-30T11:15:00.000Z' }],
    ])
    mounted.wrapper.unmount()
  })

  it('allows adding time while an extension is active', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T09:00:00.000Z'))
    const mounted = mountPanel({
      ...closedOutsideRegularHours,
      isOpen: true,
      mode: 'extension',
      closesAt: '2026-07-30T10:00:00.000Z',
    })

    expect(getButtonByText(mounted, '지금 Close').exists()).toBe(true)
    await getButtonByText(mounted, '30분').trigger('click')
    await getButtonByText(mounted, '시간 추가').trigger('click')

    expect(mounted.panel.emitted('open')).toEqual([[{ extensionMinutes: 30 }]])
    mounted.wrapper.unmount()
  })

  it('allows scheduling an extension during regular hours', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T03:00:00.000Z'))
    const mounted = mountPanel({
      ...closedOutsideRegularHours,
      isOpen: true,
      mode: 'regular',
      isWithinRegularHours: true,
      regularClosesAt: '2026-07-30T08:20:00.000Z',
      closesAt: '2026-07-30T08:20:00.000Z',
    })

    await getButtonByText(mounted, '30분').trigger('click')
    await getButtonByText(mounted, '연장 예약').trigger('click')

    expect(mounted.panel.emitted('open')).toEqual([[{ extensionMinutes: 30 }]])
    mounted.wrapper.unmount()
  })
})
