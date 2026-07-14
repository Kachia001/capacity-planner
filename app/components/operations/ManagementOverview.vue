<script setup lang="ts">
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Factory,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Workflow,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import HighAltitudeBadge from '@/components/operations/HighAltitudeBadge.vue'
import type {
  DashboardEvent,
  IssueSeverity,
  OperationsDashboardResponse,
  WorkItemEventAction,
} from '@/types/operations'

const props = defineProps<{
  dashboard: OperationsDashboardResponse | null
  pending: boolean
  errorMessage: string | null
  actorLabel: string
}>()

const emit = defineEmits<{
  selectWorkItem: [bayId: string, workItemId: number]
  refresh: []
}>()

const issuesExpanded = ref(false)

const issueTotal = computed(() => props.dashboard?.issues.length ?? 0)
const visibleIssues = computed(() => {
  const issues = props.dashboard?.issues ?? []
  return issuesExpanded.value ? issues : issues.slice(0, 12)
})

const kpis = computed(() => {
  const summary = props.dashboard?.summary

  return [
    {
      label: '전체 Bay',
      value: summary?.totalBays ?? 0,
      detail: `운영 작업 ${summary?.totalItems ?? 0}건`,
      icon: Factory,
      class: 'border-zinc-700 bg-zinc-900 text-white',
      iconClass: 'bg-white/10 text-emerald-300',
    },
    {
      label: '미작업',
      value: summary?.notStarted ?? 0,
      detail: '시작 대기 작업',
      icon: ListChecks,
      class: 'border-zinc-200 bg-white text-zinc-950',
      iconClass: 'bg-zinc-100 text-zinc-600',
    },
    {
      label: '작업 중',
      value: summary?.inProgress ?? 0,
      detail: `오늘 시작 ${summary?.startedToday ?? 0}건`,
      icon: Clock3,
      class: 'border-amber-200 bg-amber-50 text-amber-950',
      iconClass: 'bg-amber-200/70 text-amber-900',
    },
    {
      label: '완료',
      value: summary?.completed ?? 0,
      detail: `오늘 완료 ${summary?.completedToday ?? 0}건`,
      icon: CheckCircle2,
      class: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      iconClass: 'bg-emerald-200/70 text-emerald-900',
    },
    {
      label: '열린 이슈',
      value: summary?.openIssues ?? 0,
      detail: `영향 Bay ${summary?.issueBays ?? 0}개`,
      icon: AlertTriangle,
      class: 'border-red-200 bg-red-50 text-red-950',
      iconClass: 'bg-red-200/70 text-red-900',
    },
    {
      label: '진행 중 고소작업',
      value: summary?.highAltitudeInProgress ?? 0,
      detail: '안전 식별 활성',
      icon: ShieldAlert,
      class: 'border-orange-200 bg-orange-50 text-orange-950',
      iconClass: 'bg-orange-200/70 text-orange-900',
    },
  ]
})

function selectWorkItem(bayId: string, workItemId: number) {
  emit('selectWorkItem', bayId, workItemId)
}

function toggleIssuesExpanded() {
  issuesExpanded.value = !issuesExpanded.value
}

function refreshDashboard() {
  emit('refresh')
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

function eventPresentation(action: WorkItemEventAction) {
  if (action === 'start') return { label: '작업 시작', class: 'bg-amber-100 text-amber-900' }
  if (action === 'complete') return { label: '작업 완료', class: 'bg-emerald-100 text-emerald-900' }
  if (action === 'cancel_start') return { label: '시작 취소', class: 'bg-sky-100 text-sky-900' }
  return { label: '작업 무효화', class: 'bg-red-100 text-red-900' }
}

function severityPresentation(severity: IssueSeverity | null) {
  if (severity === 'critical') return { label: '긴급', class: 'bg-red-600 text-white' }
  if (severity === 'high') return { label: '중요', class: 'bg-red-100 text-red-900' }
  if (severity === 'low') return { label: '경미', class: 'bg-zinc-100 text-zinc-700' }
  return { label: '보통', class: 'bg-amber-100 text-amber-900' }
}

function eventActor(event: DashboardEvent) {
  return event.actorName || event.actorEmail || event.actorRole
}
</script>

<template>
  <section class="border-b border-zinc-300 bg-[#edf2ee]">
    <div class="mx-auto w-full max-w-[94rem] px-4 py-8 sm:px-6 lg:px-8">
      <header
        class="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 px-5 py-6 text-white shadow-[0_28px_80px_-54px_rgba(15,23,42,0.85)] sm:px-7"
      >
        <div class="absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              class="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300"
            >
              <span
                class="size-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]"
              />
              Operations control room
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              전체 Bay 운영 현황
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              작업 상태 요약과 이슈·고소작업을 확인하고 필요한 작업으로 바로 이동합니다.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5">
              <p class="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Signed in</p>
              <p class="mt-1 text-sm font-semibold text-zinc-100">{{ props.actorLabel }}</p>
            </div>
            <Button
              variant="outline"
              class="h-11 border-zinc-700 bg-zinc-900 px-4 text-white hover:bg-zinc-800 hover:text-white"
              :disabled="props.pending"
              @click="refreshDashboard"
            >
              <RefreshCw class="size-4" :class="props.pending ? 'animate-spin' : ''" />
              {{ props.pending ? '동기화 중' : '새로고침' }}
            </Button>
          </div>
        </div>
      </header>

      <div
        v-if="props.errorMessage"
        class="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {{ props.errorMessage }}
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="kpi in kpis"
          :key="kpi.label"
          class="rounded-md border p-4 shadow-sm"
          :class="kpi.class"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold opacity-65">{{ kpi.label }}</p>
              <p class="mt-2 text-3xl font-semibold tabular-nums tracking-[-0.04em]">
                {{ kpi.value }}
              </p>
            </div>
            <span class="flex size-9 items-center justify-center rounded-md" :class="kpi.iconClass">
              <component :is="kpi.icon" class="size-4" />
            </span>
          </div>
          <p class="mt-4 text-[11px] font-medium opacity-60">{{ kpi.detail }}</p>
        </article>
      </div>

      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section class="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
          <header
            class="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4"
          >
            <div>
              <p class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">
                Issue queue
              </p>
              <h2 class="mt-1 font-semibold text-zinc-950">확인 필요한 이슈</h2>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="issueTotal"
                class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold tabular-nums text-red-700"
              >
                {{ issueTotal }}건
              </span>
              <Button
                v-if="issueTotal > 12"
                variant="ghost"
                size="sm"
                class="h-8 gap-1 px-2 text-xs text-zinc-600 hover:bg-zinc-100"
                :aria-expanded="issuesExpanded"
                @click="toggleIssuesExpanded"
              >
                {{ issuesExpanded ? '접기' : `전체 ${issueTotal}건 보기` }}
                <ChevronUp v-if="issuesExpanded" class="size-3.5" />
                <ChevronDown v-else class="size-3.5" />
              </Button>
              <AlertTriangle class="size-5 text-red-500" />
            </div>
          </header>
          <div
            v-if="!props.dashboard?.issues.length"
            class="flex min-h-48 items-center justify-center text-sm text-zinc-500"
          >
            열린 이슈가 없습니다.
          </div>
          <div v-else class="max-h-[34rem] divide-y divide-zinc-100 overflow-y-auto">
            <button
              v-for="issue in visibleIssues"
              :key="issue.id"
              type="button"
              class="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-red-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
              :aria-label="`${issue.bayCode} ${issue.workName || '작업명 없음'} 이슈 작업으로 이동`"
              @click="selectWorkItem(issue.bayId, issue.id)"
            >
              <span
                class="mt-0.5 rounded-full px-2 py-1 text-[10px] font-bold"
                :class="severityPresentation(issue.severity).class"
              >
                {{ severityPresentation(issue.severity).label }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="font-mono text-xs text-zinc-950">{{ issue.bayCode }}</strong>
                  <HighAltitudeBadge :active="issue.isHighAltitude" compact />
                </span>
                <span class="mt-1 block truncate text-sm font-semibold text-zinc-800">{{
                  issue.workName || '작업명 없음'
                }}</span>
                <span class="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-500">{{
                  issue.issueNote || issue.workDetail || '이슈 내용 없음'
                }}</span>
              </span>
              <ArrowUpRight class="mt-1 size-4 shrink-0 text-zinc-400" />
            </button>
          </div>
        </section>

        <section class="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
          <header
            class="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4"
          >
            <div>
              <p
                class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Activity log
              </p>
              <h2 class="mt-1 font-semibold text-zinc-950">최근 상태 변경</h2>
            </div>
            <Workflow class="size-5 text-emerald-600" />
          </header>
          <div
            v-if="!props.dashboard?.recentEvents.length"
            class="flex min-h-48 items-center justify-center text-sm text-zinc-500"
          >
            기록된 상태 변경이 없습니다.
          </div>
          <div v-else class="max-h-[31rem] divide-y divide-zinc-100 overflow-y-auto">
            <button
              v-for="event in props.dashboard.recentEvents"
              :key="event.id"
              type="button"
              class="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-zinc-50"
              @click="selectWorkItem(event.bayId, event.workItemId)"
            >
              <span
                class="mt-0.5 rounded-full px-2 py-1 text-[10px] font-bold"
                :class="eventPresentation(event.action).class"
              >
                {{ eventPresentation(event.action).label }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-zinc-900">
                  {{ event.bayCode }} ·
                  {{ event.workName || event.workDetail || `작업 #${event.workItemId}` }}
                </span>
                <span class="mt-1 block text-xs text-zinc-500">
                  {{ eventActor(event) }} · {{ formatDateTime(event.createdAt) }}
                </span>
                <span v-if="event.reason" class="mt-1 line-clamp-1 block text-xs text-zinc-600"
                  >사유: {{ event.reason }}</span
                >
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
