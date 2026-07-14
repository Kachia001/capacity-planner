<script setup lang="ts">
import { ArrowUpRight, Loader2, Search, UsersRound } from '@lucide/vue'
import HighAltitudeBadge from '@/components/operations/HighAltitudeBadge.vue'
import type { DashboardBaySummary } from '@/types/operations'

type BayViewFilter = 'all' | 'attention' | 'in_progress' | 'completed' | 'high_altitude'

const props = withDefaults(
  defineProps<{
    bays: DashboardBaySummary[]
    selectedBayId: string | null
    pending: boolean
    showFilters?: boolean
  }>(),
  {
    showFilters: true,
  },
)

const emit = defineEmits<{
  selectBay: [bayId: string]
}>()

const bayQuery = ref('')
const bayViewFilter = ref<BayViewFilter>('all')

const filteredBays = computed(() => {
  const query = props.showFilters ? bayQuery.value.trim().toLocaleLowerCase() : ''

  return props.bays
    .filter(bay => {
      if (
        query &&
        ![bay.code, bay.description ?? ''].some(value => value.toLocaleLowerCase().includes(query))
      ) {
        return false
      }

      if (!props.showFilters) return true
      if (bayViewFilter.value === 'attention') return bay.openIssues > 0
      if (bayViewFilter.value === 'in_progress') return bay.inProgress > 0
      if (bayViewFilter.value === 'completed') return bay.total > 0 && bay.completed === bay.total
      if (bayViewFilter.value === 'high_altitude') return bay.highAltitude > 0
      return true
    })
    .sort((first, second) =>
      first.code.localeCompare(second.code, undefined, { numeric: true, sensitivity: 'base' }),
    )
})

function handleSelectBay(bayId: string) {
  emit('selectBay', bayId)
}

function segmentWidth(value: number, total: number) {
  return total > 0 ? `${(value / total) * 100}%` : '0%'
}

function formatDateTime(value: string | null) {
  if (!value) return '활동 없음'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function bayStatusLabel(bay: DashboardBaySummary) {
  if (bay.openIssues > 0) return `이슈 ${bay.openIssues}건`
  if (bay.total > 0 && bay.completed === bay.total) return '전체 완료'
  if (bay.inProgress > 0) return `${bay.inProgress}건 진행 중`
  return '시작 대기'
}
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-[#d6dad2] bg-white shadow-[0_14px_40px_rgba(24,35,26,0.055)]"
  >
    <div
      class="flex flex-col gap-4 border-b border-[#e0e4dd] bg-[#f9faf8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div>
        <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#718068]">
          Bay matrix
        </p>
        <h2 class="mt-1 text-lg font-semibold text-[#171a17]">Bay별 상태 분포</h2>
      </div>
      <div v-if="props.showFilters" class="flex flex-col gap-2 sm:flex-row">
        <label class="relative sm:w-64">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <span class="sr-only">Bay 검색</span>
          <input
            v-model="bayQuery"
            type="search"
            placeholder="Bay 코드 또는 설명"
            class="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <select
          v-model="bayViewFilter"
          class="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">전체 Bay</option>
          <option value="attention">이슈 있음</option>
          <option value="in_progress">작업 중</option>
          <option value="completed">완료</option>
          <option value="high_altitude">고소작업 포함</option>
        </select>
      </div>
    </div>

    <div
      v-if="props.pending && props.bays.length === 0"
      class="flex min-h-64 items-center justify-center text-sm text-zinc-500"
    >
      <Loader2 class="mr-2 size-5 animate-spin text-emerald-600" /> 운영 집계를 불러오는 중입니다.
    </div>

    <div
      v-else-if="filteredBays.length === 0"
      class="flex min-h-56 items-center justify-center text-sm text-zinc-500"
    >
      현재 필터에 표시할 Bay가 없습니다.
    </div>

    <div v-else class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <button
        v-for="bay in filteredBays"
        :key="bay.id"
        type="button"
        class="group rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#8aaa70] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aaa70]"
        :class="
          props.selectedBayId === bay.id
            ? 'border-[#8aaa70] bg-[#f1f7eb] ring-2 ring-[#dcebcf]'
            : 'border-[#e0e4dd] bg-white'
        "
        @click="handleSelectBay(bay.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-lg font-bold tracking-[-0.02em] text-zinc-950">
              {{ bay.code }}
            </p>
            <p class="mt-1 truncate text-xs text-zinc-500">
              {{ bay.description || '설명 없음' }}
            </p>
          </div>
          <ArrowUpRight
            class="size-4 shrink-0 text-zinc-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#5d784d]"
          />
        </div>

        <div class="mt-5 flex items-end justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Completion
            </p>
            <p class="mt-1 text-xs font-semibold text-zinc-600">
              {{ bay.completed }}/{{ bay.total }}
            </p>
          </div>
          <p class="text-3xl font-semibold tabular-nums tracking-[-0.05em] text-zinc-950">
            {{ bay.completionRate }}%
          </p>
        </div>

        <div
          class="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-100"
          aria-label="상태별 작업 분포"
        >
          <span class="bg-zinc-300" :style="{ width: segmentWidth(bay.notStarted, bay.total) }" />
          <span class="bg-amber-400" :style="{ width: segmentWidth(bay.inProgress, bay.total) }" />
          <span class="bg-emerald-500" :style="{ width: segmentWidth(bay.completed, bay.total) }" />
        </div>

        <dl class="mt-3 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-sm bg-zinc-100 px-2 py-2">
            <dt class="text-[10px] text-zinc-500">미작업</dt>
            <dd class="mt-0.5 font-semibold tabular-nums">{{ bay.notStarted }}</dd>
          </div>
          <div class="rounded-sm bg-amber-50 px-2 py-2 text-amber-950">
            <dt class="text-[10px] text-amber-700">작업 중</dt>
            <dd class="mt-0.5 font-semibold tabular-nums">{{ bay.inProgress }}</dd>
          </div>
          <div class="rounded-sm bg-emerald-50 px-2 py-2 text-emerald-950">
            <dt class="text-[10px] text-emerald-700">완료</dt>
            <dd class="mt-0.5 font-semibold tabular-nums">{{ bay.completed }}</dd>
          </div>
        </dl>

        <div
          class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs"
        >
          <span :class="bay.openIssues > 0 ? 'font-bold text-red-700' : 'text-zinc-500'">
            {{ bayStatusLabel(bay) }}
          </span>
          <div class="flex items-center gap-2 text-zinc-500">
            <span v-if="bay.activeWorkers > 0" class="inline-flex items-center gap-1">
              <UsersRound class="size-3.5" /> {{ bay.activeWorkers }}명
            </span>
            <HighAltitudeBadge :active="bay.highAltitude > 0" compact />
          </div>
        </div>
        <p class="mt-2 text-[10px] text-zinc-400">
          최근 활동 {{ formatDateTime(bay.lastActivityAt) }}
        </p>
      </button>
    </div>
  </section>
</template>
