/** @vitest-environment happy-dom */

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import Button from './Button.vue'

describe('Button', () => {
  it('uses the native disabled attribute when no tooltip is needed', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: '저장',
      },
    })

    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.classes()).toContain('cursor-not-allowed')
  })

  it('keeps the button as the layout root while exposing a disabled reason', async () => {
    const onClick = vi.fn()
    const wrapper = mount(
      defineComponent({
        components: { Button, TooltipProvider },
        setup: () => ({ onClick }),
        template: `
          <TooltipProvider>
            <Button
              class="ml-auto"
              disabled
              disabled-reason="필수 항목을 입력해 주세요."
              @click="onClick"
            >
              저장
            </Button>
          </TooltipProvider>
        `,
      }),
    )

    const button = wrapper.get('[data-slot="button"]')
    expect(button.element.tagName).toBe('BUTTON')
    expect(button.classes()).toContain('ml-auto')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-disabled')).toBe('true')

    await button.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('prevents disabled as-child links from navigating or emitting clicks', async () => {
    const onClick = vi.fn()
    const wrapper = mount(
      defineComponent({
        components: { Button },
        setup: () => ({ onClick }),
        template: `
          <Button as-child disabled>
            <a href="/accounts" @click="onClick">계정</a>
          </Button>
        `,
      }),
    )

    const link = wrapper.get('a')
    expect(link.attributes('aria-disabled')).toBe('true')
    expect(link.attributes('tabindex')).toBe('-1')

    await link.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('exposes loading state and loading text', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
        loadingText: '저장 중',
      },
      slots: {
        default: '저장',
      },
    })

    const button = wrapper.get('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('저장 중')
  })
})
