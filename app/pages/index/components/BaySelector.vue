<script lang="ts">
export interface BaySelectorBay {
  bay: string
  total: number
  completed: number
  issues: number
  completionRate: number
}

export interface BaySelectorProps {
  bays: BaySelectorBay[]
  selectedBay: string | null
  pending: boolean
}
</script>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = defineProps<BaySelectorProps>()

defineEmits<{
  select: [bay: string]
}>()

const bayScroller = ref<HTMLElement | null>(null)

function scrollBayList(direction: 'previous' | 'next') {
  const scroller = bayScroller.value

  if (!scroller) {
    return
  }

  scroller.scrollBy({
    left: direction === 'next' ? scroller.clientWidth * 0.85 : scroller.clientWidth * -0.85,
    behavior: 'smooth',
  })
}

function bayDotClass(bay: { issues: number, completionRate: number }) {
  if (bay.issues > 0) {
    return 'bg-red-500'
  }

  if (bay.completionRate === 100) {
    return 'bg-emerald-500'
  }

  return 'bg-amber-400'
}

function bayButtonClass(bay: { bay: string, issues: number, completionRate: number }) {
  if (bay.bay === props.selectedBay) {
    return 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200 hover:bg-emerald-50 hover:text-emerald-950'
  }

  if (bay.issues > 0) {
    return 'border-red-200 bg-red-50/70 hover:bg-red-50'
  }

  if (bay.completionRate === 100) {
    return 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
  }

  return 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
}
</script>

<template>
  <div
    v-if="bays.length === 0 && !pending"
    class="rounded-md border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-center text-sm text-muted-foreground"
  >
    저장된 bay 데이터가 없습니다.
  </div>

  <div v-else class="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      aria-label="이전 bay 보기"
      class="shrink-0"
      @click="scrollBayList('previous')"
    >
      <ChevronLeft class="size-4" />
    </Button>

    <div
      ref="bayScroller"
      class="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 pb-1"
    >
      <Button
        v-for="bay in bays"
        :key="bay.bay"
        type="button"
        variant="outline"
        class="block min-h-20 w-40 shrink-0 snap-start rounded-md p-3 text-left focus-visible:ring-2 focus-visible:ring-emerald-500"
        :class="bayButtonClass(bay)"
        @click="$emit('select', bay.bay)"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="break-words text-base font-semibold leading-tight">{{ bay.bay }}</span>
          <span class="mt-1 size-2.5 shrink-0 rounded-full" :class="bayDotClass(bay)" />
        </div>
        <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ bay.completed }}/{{ bay.total }}</span>
          <span>{{ bay.completionRate }}%</span>
        </div>
        <div class="mt-2 h-1 overflow-hidden rounded-full bg-white/80">
          <div
            class="h-full rounded-full bg-emerald-500 transition-all"
            :style="{ width: `${bay.completionRate}%` }"
          />
        </div>
        <div class="mt-1 text-xs font-medium" :class="bay.issues > 0 ? 'text-red-700' : 'text-muted-foreground'">
          {{ bay.issues > 0 ? `이슈 ${bay.issues}건` : '이슈 없음' }}
        </div>
      </Button>
    </div>

    <Button
      variant="outline"
      size="sm"
      aria-label="다음 bay 보기"
      class="shrink-0"
      @click="scrollBayList('next')"
    >
      <ChevronRight class="size-4" />
    </Button>
  </div>
</template>
