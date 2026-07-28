<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from './variants'
import { Loader2 } from '@lucide/vue'
import { Primitive } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { buttonVariants } from './variants'

defineOptions({
  inheritAttrs: false,
})

type ButtonType = 'button' | 'submit' | 'reset'
type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  tone?: ButtonVariants['tone']
  size?: ButtonVariants['size']
  shape?: ButtonVariants['shape']
  fullWidth?: ButtonVariants['fullWidth']
  class?: HTMLAttributes['class']
  type?: ButtonType
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  tooltip?: string
  disabledReason?: string
  tooltipSide?: TooltipSide
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
  loading: false,
  disabled: false,
  tooltipSide: 'top',
})

const attrs = useAttrs()
const effectiveDisabled = computed(() => props.disabled || props.loading)
const isNativeButton = computed(() => props.as === 'button' && !props.asChild)
const nativeType = computed(() => (isNativeButton.value ? props.type : undefined))
const visibleTooltip = computed(() => {
  if (effectiveDisabled.value && props.disabledReason) return props.disabledReason
  return props.tooltip
})
function getForwardedAttrs() {
  if (!isNativeButton.value && effectiveDisabled.value && !visibleTooltip.value) {
    return {
      ...attrs,
      tabindex: -1,
    }
  }

  return attrs
}
const classes = computed(() =>
  cn(
    buttonVariants({
      variant: props.variant,
      tone: props.tone,
      size: props.size,
      shape: props.shape,
      fullWidth: props.fullWidth,
    }),
    effectiveDisabled.value && 'cursor-not-allowed opacity-50',
    props.loading && 'cursor-wait',
    props.class,
  ),
)

function preventDisabledAction(event: Event) {
  if (!effectiveDisabled.value) return

  event.preventDefault()
  event.stopImmediatePropagation()
  event.stopPropagation()
}
</script>

<template>
  <Tooltip v-if="visibleTooltip">
    <TooltipTrigger as-child>
      <Primitive
        v-bind="getForwardedAttrs()"
        data-slot="button"
        :data-variant="variant"
        :data-tone="tone"
        :data-size="size"
        :data-shape="shape"
        :data-loading="loading || undefined"
        :as="as"
        :as-child="asChild"
        :type="nativeType"
        :aria-disabled="effectiveDisabled || undefined"
        :aria-busy="loading || undefined"
        :class="classes"
        @click.capture="preventDisabledAction"
      >
        <Loader2 v-if="loading" class="animate-spin" aria-hidden="true" />
        <template v-if="loading && loadingText">{{ loadingText }}</template>
        <slot v-else />
      </Primitive>
    </TooltipTrigger>
    <TooltipContent :side="tooltipSide">
      {{ visibleTooltip }}
    </TooltipContent>
  </Tooltip>

  <Primitive
    v-else
    v-bind="getForwardedAttrs()"
    data-slot="button"
    :data-variant="variant"
    :data-tone="tone"
    :data-size="size"
    :data-shape="shape"
    :data-loading="loading || undefined"
    :as="as"
    :as-child="asChild"
    :type="nativeType"
    :disabled="isNativeButton ? effectiveDisabled : undefined"
    :aria-disabled="effectiveDisabled || undefined"
    :aria-busy="loading || undefined"
    :class="classes"
    @click.capture="preventDisabledAction"
  >
    <Loader2 v-if="loading" class="animate-spin" aria-hidden="true" />
    <template v-if="loading && loadingText">{{ loadingText }}</template>
    <slot v-else />
  </Primitive>
</template>
