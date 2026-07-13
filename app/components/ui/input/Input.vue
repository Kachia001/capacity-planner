<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const modelValue = defineModel<string | null>()
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    v-bind="$attrs"
    :class="
      cn(
        'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
