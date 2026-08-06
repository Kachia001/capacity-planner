<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import type { WorkTableOverview } from '#shared/api/tables/table.contract'

const props = defineProps<{
  table: WorkTableOverview
  numberLabel: string
  statusLabel: string
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="group relative flex min-h-36 min-w-0 cursor-pointer flex-col border border-[#c5cdd1] bg-white/[0.025] px-2.5 py-3 text-left text-white transition duration-200 hover:-translate-y-0.5 hover:border-[#c5f277] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5f277]"
    :aria-label="`${props.numberLabel}번 테이블 상세 보기`"
    @click="$emit('select')"
  >
    <span class="flex w-full items-start justify-between gap-1">
      <strong class="font-mono text-lg font-medium tracking-[-0.04em]">{{ props.numberLabel }}</strong>
      <AlertTriangle
        v-if="props.table.bay?.openIssues"
        class="size-3.5 shrink-0 text-red-300"
      />
    </span>

    <template v-if="props.table.bay">
      <span class="mt-3 block w-full truncate text-[11px] font-semibold text-[#f4f6f7]">
        {{ props.table.bay.code }}
      </span>
      <span class="mt-auto flex w-full items-end justify-between gap-1 pt-3">
        <span class="text-[9px] text-[#aab5bb]">{{ props.statusLabel }}</span>
        <strong class="font-mono text-xs">{{ props.table.bay.completionRate }}%</strong>
      </span>
      <span class="mt-2 h-1 w-full overflow-hidden bg-white/15">
        <span
          class="block h-full transition-all"
          :class="props.table.bay.openIssues ? 'bg-red-400' : 'bg-[#c5f277]'"
          :style="{ width: `${props.table.bay.completionRate}%` }"
        />
      </span>
    </template>
    <span v-else class="mt-auto text-[9px] font-medium leading-4 text-[#aab5bb]">BAY<br />할당하기</span>
  </button>
</template>
