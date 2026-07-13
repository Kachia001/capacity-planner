<script setup lang="ts">
import { ShieldAlert } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)
</script>

<template>
  <span
    v-if="props.active"
    class="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 font-bold text-amber-950 shadow-sm shadow-amber-900/5"
    :class="props.compact ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs'"
  >
    <ShieldAlert class="size-3.5" />
    고소작업
  </span>
</template>
