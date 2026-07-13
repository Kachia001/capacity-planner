<script setup lang="ts">
import { CheckCircle2, CircleDashed, Clock3 } from '@lucide/vue'
import type { WorkItemStatus } from '@/types/operations'

const props = defineProps<{
  status: WorkItemStatus
}>()

const presentation = computed(() => {
  if (props.status === 'completed') {
    return {
      label: '작업 완료',
      icon: CheckCircle2,
      class: 'border-emerald-200 bg-emerald-100 text-emerald-900',
    }
  }

  if (props.status === 'in_progress') {
    return {
      label: '작업 중',
      icon: Clock3,
      class: 'border-amber-200 bg-amber-100 text-amber-950',
    }
  }

  return {
    label: '미작업',
    icon: CircleDashed,
    class: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  }
})
</script>

<template>
  <span
    class="inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold"
    :class="presentation.class"
  >
    <component :is="presentation.icon" class="size-3.5" />
    {{ presentation.label }}
  </span>
</template>
