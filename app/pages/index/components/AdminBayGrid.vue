<script lang="ts">
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'

export interface AdminBayGridProps {
  bays: BaySelectorBay[]
  pending: boolean
}
</script>

<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from '@lucide/vue'

defineProps<AdminBayGridProps>()

defineEmits<{
  select: [bay: string]
}>()

function bayState(bay: BaySelectorBay) {
  if (bay.issues > 0) {
    return {
      label: `이슈 ${bay.issues}`,
      icon: AlertTriangle,
      class: 'border-red-200 bg-red-50/90 text-red-800 hover:border-red-300 hover:bg-red-50',
      meter: 'bg-red-500',
    }
  }

  if (bay.completionRate === 100) {
    return {
      label: '완료',
      icon: CheckCircle2,
      class: 'border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50',
      meter: 'bg-emerald-500',
    }
  }

  return {
    label: '진행 중',
    icon: Clock3,
    class: 'border-amber-200 bg-amber-50/90 text-amber-800 hover:border-amber-300 hover:bg-amber-50',
    meter: 'bg-amber-400',
  }
}
</script>

<template>
  <div class="w-full">
    <div
      v-if="pending && bays.length === 0"
      class="flex min-h-56 items-center justify-center rounded-md border border-dashed border-emerald-200 bg-white/70 text-sm text-muted-foreground"
    >
      <Loader2 class="mr-2 size-4 animate-spin" />
      Bay 데이터를 불러오는 중입니다.
    </div>

    <div
      v-else-if="bays.length === 0"
      class="flex min-h-56 items-center justify-center rounded-md border border-dashed border-emerald-200 bg-white/70 text-sm text-muted-foreground"
    >
      저장된 bay 데이터가 없습니다.
    </div>

    <div
      v-else
      class="grid w-full grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3 sm:gap-4"
    >
      <button
        v-for="bay in bays"
        :key="bay.bay"
        type="button"
        class="group relative min-h-36 overflow-hidden rounded-md border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        :class="bayState(bay).class"
        @click="$emit('select', bay.bay)"
      >
        <div class="relative min-h-8 pr-8">
          <span class="block min-w-0 break-all text-xl font-semibold leading-tight tracking-tight text-zinc-950">
            {{ bay.bay }}
          </span>
          <span class="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-current/10">
            <component :is="bayState(bay).icon" class="size-4 shrink-0 overflow-visible" />
          </span>
        </div>

        <div class="mt-7 flex items-end justify-between gap-3">
          <div>
            <div class="text-xs font-medium tracking-[0.18em] text-zinc-500">
              진행률
            </div>
            <div class="mt-1 text-sm font-semibold text-zinc-950">
              {{ bay.completed }}/{{ bay.total }}
            </div>
          </div>
          <div class="text-2xl font-semibold tabular-nums text-zinc-950">
            {{ bay.completionRate }}%
          </div>
        </div>

        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="bayState(bay).meter"
            :style="{ width: `${bay.completionRate}%` }"
          />
        </div>

        <div class="mt-3 text-xs font-semibold">
          {{ bayState(bay).label }}
        </div>
      </button>
    </div>
  </div>
</template>
