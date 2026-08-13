<script setup lang="ts">
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ServerCog,
  Trash2,
  TriangleAlert,
  UserRound,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type {
  ApplicationLogActor,
  ApplicationLogItem,
  ApplicationLogLevel,
  ApplicationLogPurgeResponse,
  ApplicationLogsResponse,
} from '@/types/application-log'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: '서버 로그 · Capacity Planner' })

const PAGE_SIZE = 50
const SEOUL_TIME_ZONE = 'Asia/Seoul'

const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()
const loading = ref(true)
const refreshing = ref(false)
const purgeMode = ref<'before' | 'all' | null>(null)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const logs = ref<ApplicationLogItem[]>([])
const nextCursor = ref<string | null>(null)
const currentCursor = ref<string | null>(null)
const cursorHistory = ref<(string | null)[]>([])
const actors = ref<ApplicationLogActor[]>([])
const purgeBefore = ref(defaultPurgeDate())

interface LogFilters {
  level: 'all' | ApplicationLogLevel
  category: string
  event: string
  actorUserId: string
  from: string
  to: string
}

const filters = reactive<LogFilters>({
  level: 'all',
  category: '',
  event: '',
  actorUserId: 'all',
  from: '',
  to: '',
})
const activeFilters = ref<LogFilters>({ ...filters })

const pageNumber = computed(() => cursorHistory.value.length + 1)
const purging = computed(() => purgeMode.value !== null)
const actorById = computed(() => new Map(actors.value.map(actor => [actor.id, actor])))
const levelCounts = computed(() => {
  const counts: Record<ApplicationLogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }
  for (const log of logs.value) counts[log.level] += 1
  return counts
})
const hasActiveFilters = computed(() => {
  const value = activeFilters.value
  return (
    value.level !== 'all' ||
    Boolean(value.category || value.event || value.from || value.to) ||
    value.actorUserId !== 'all'
  )
})

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const levelPresentation: Record<
  ApplicationLogLevel,
  { label: string; className: string; dotClassName: string }
> = {
  debug: {
    label: 'DEBUG',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    dotClassName: 'bg-slate-400',
  },
  info: {
    label: 'INFO',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    dotClassName: 'bg-blue-500',
  },
  warn: {
    label: 'WARN',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    dotClassName: 'bg-amber-500',
  },
  error: {
    label: 'ERROR',
    className: 'border-red-200 bg-red-50 text-red-700',
    dotClassName: 'bg-red-500',
  },
}

function defaultPurgeDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  return metadata ? JSON.stringify(metadata, null, 2) : ''
}

function actorLabel(actorUserId: string | null) {
  if (!actorUserId) return '시스템'
  const actor = actorById.value.get(actorUserId)
  if (!actor) return `삭제된 계정 · ${actorUserId.slice(0, 8)}…`
  return actor.displayName || actor.email.split('@')[0] || actor.email
}

function actorSecondaryLabel(actorUserId: string | null) {
  if (!actorUserId) return '사용자 행위 아님'
  const actor = actorById.value.get(actorUserId)
  return actor?.email ?? actorUserId
}

function toIsoDateTime(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function buildQuery() {
  const value = activeFilters.value
  return {
    limit: PAGE_SIZE,
    ...(value.level !== 'all' ? { level: value.level } : {}),
    ...(value.category ? { category: value.category } : {}),
    ...(value.event ? { event: value.event } : {}),
    ...(value.actorUserId !== 'all' ? { actorUserId: value.actorUserId } : {}),
    ...(toIsoDateTime(value.from) ? { from: toIsoDateTime(value.from) } : {}),
    ...(toIsoDateTime(value.to) ? { to: toIsoDateTime(value.to) } : {}),
    ...(currentCursor.value ? { cursor: currentCursor.value } : {}),
  }
}

async function requireAuthenticated() {
  await auth.initialize()
  if (!auth.user) throw new Error('로그인이 필요합니다.')
}

async function loadActors() {
  try {
    actors.value = await $fetch<ApplicationLogActor[]>('/api/users')
  } catch {
    actors.value = []
  }
}

async function loadLogs(options: { initial?: boolean } = {}) {
  if (options.initial) loading.value = true
  else refreshing.value = true
  errorMessage.value = null

  try {
    await requireAuthenticated()
    const response = await $fetch<ApplicationLogsResponse>('/api/admin/application-logs', {
      query: buildQuery(),
    })
    logs.value = response.items
    nextCursor.value = response.nextCursor
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '서버 로그를 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function applyFilters() {
  const from = toIsoDateTime(filters.from)
  const to = toIsoDateTime(filters.to)
  if ((filters.from && !from) || (filters.to && !to)) {
    errorMessage.value = '조회 일시 형식을 확인해 주세요.'
    return
  }
  if (from && to && new Date(from) > new Date(to)) {
    errorMessage.value = '조회 시작 시각은 종료 시각보다 늦을 수 없습니다.'
    return
  }

  activeFilters.value = {
    level: filters.level,
    category: filters.category.trim(),
    event: filters.event.trim(),
    actorUserId: filters.actorUserId,
    from: filters.from,
    to: filters.to,
  }
  currentCursor.value = null
  cursorHistory.value = []
  noticeMessage.value = null
  await loadLogs()
}

async function resetFilters() {
  Object.assign(filters, {
    level: 'all',
    category: '',
    event: '',
    actorUserId: 'all',
    from: '',
    to: '',
  } satisfies LogFilters)
  activeFilters.value = { ...filters }
  currentCursor.value = null
  cursorHistory.value = []
  noticeMessage.value = null
  await loadLogs()
}

async function goToNextPage() {
  if (!nextCursor.value) return
  cursorHistory.value.push(currentCursor.value)
  currentCursor.value = nextCursor.value
  await loadLogs()
}

async function goToPreviousPage() {
  if (cursorHistory.value.length === 0) return
  currentCursor.value = cursorHistory.value.pop() ?? null
  await loadLogs()
}

async function purgeLogsBeforeDate() {
  if (!purgeBefore.value) {
    errorMessage.value = '삭제 기준 일자를 선택해 주세요.'
    return
  }

  const before = new Date(`${purgeBefore.value}T00:00:00+09:00`)
  if (Number.isNaN(before.getTime())) {
    errorMessage.value = '삭제 기준 일자를 확인해 주세요.'
    return
  }

  const accepted = await globalAlert.confirm({
    variant: 'destructive',
    title: '이 날짜 이전 로그를 비울까요?',
    message:
      '선택한 날짜의 00시(한국 시간) 이전에 생성된 서버 로그가 영구 삭제됩니다. 삭제된 로그는 복구할 수 없습니다.',
    confirmLabel: '이전 로그 삭제',
    cancelLabel: '취소',
    details: [
      { label: '삭제 기준', value: `${purgeBefore.value} 00:00 (KST)`, tone: 'danger' },
      { label: '유지 범위', value: `${purgeBefore.value} 00:00 이후 로그` },
    ],
  })
  if (!accepted) return

  purgeMode.value = 'before'
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await requireAuthenticated()
    const result = await $fetch<ApplicationLogPurgeResponse>('/api/admin/application-logs/purge', {
      method: 'POST',
      body: { mode: 'before', before: before.toISOString() },
    })
    currentCursor.value = null
    cursorHistory.value = []
    noticeMessage.value = `${result.deletedCount.toLocaleString('ko-KR')}건의 이전 로그를 삭제했습니다. 삭제 행위 로그는 새로 기록되었습니다.`
    await loadLogs()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '이전 로그를 삭제하지 못했습니다.')
  } finally {
    purgeMode.value = null
  }
}

async function purgeAllLogs() {
  const accepted = await globalAlert.confirm({
    variant: 'destructive',
    title: '서버 로그를 모두 비울까요?',
    message:
      '현재 저장된 모든 서버 로그가 영구 삭제됩니다. 작업 완료 후 전체 삭제 행위를 기록한 로그 1건만 새로 남습니다.',
    confirmLabel: '전체 로그 삭제',
    cancelLabel: '취소',
    details: [
      { label: '삭제 범위', value: '현재 저장된 서버 로그 전체', tone: 'danger' },
      { label: '복구 가능 여부', value: '복구 불가', tone: 'danger' },
    ],
    acknowledgementLabel: '모든 기존 서버 로그가 삭제되며 복구할 수 없음을 이해했습니다.',
  })
  if (!accepted) return

  purgeMode.value = 'all'
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await requireAuthenticated()
    const result = await $fetch<ApplicationLogPurgeResponse>('/api/admin/application-logs/purge', {
      method: 'POST',
      body: { mode: 'all', confirmation: 'DELETE_ALL_LOGS' },
    })
    currentCursor.value = null
    cursorHistory.value = []
    noticeMessage.value = `${result.deletedCount.toLocaleString('ko-KR')}건의 로그를 모두 삭제했습니다. 삭제 행위 로그 1건이 새로 기록되었습니다.`
    await loadLogs()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '서버 로그를 전체 삭제하지 못했습니다.')
  } finally {
    purgeMode.value = null
  }
}

onMounted(() => {
  void Promise.all([loadActors(), loadLogs({ initial: true })])
})
</script>

<template>
  <main class="mx-auto w-full max-w-[100rem] space-y-6 p-4 sm:p-6 lg:p-8 xl:p-10">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#788075]">
          Server-side activity
        </p>
        <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171a17] sm:text-3xl">
          서버 로그
        </h2>
        <p class="mt-2 text-sm leading-6 text-[#6e756d]">
          서버에서 발생한 주요 행위와 오류를 조회하고 보관 로그를 관리합니다.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        tone="neutral"
        :disabled="loading || refreshing || purging"
        @click="loadLogs()"
      >
        <RefreshCw class="size-4" :class="{ 'animate-spin': refreshing }" />
        새로고침
      </Button>
    </header>

    <div
      v-if="errorMessage"
      role="alert"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
      <span class="flex-1">{{ errorMessage }}</span>
      <button
        type="button"
        class="font-semibold underline underline-offset-2"
        @click="errorMessage = null"
      >
        닫기
      </button>
    </div>

    <div
      v-if="noticeMessage"
      role="status"
      class="rounded-xl border border-[#cfe2a7] bg-[#f3f9e8] px-4 py-3 text-sm text-[#425238]"
    >
      {{ noticeMessage }}
    </div>

    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="현재 페이지 로그 수준별 건수"
    >
      <article
        v-for="level in ['debug', 'info', 'warn', 'error'] as ApplicationLogLevel[]"
        :key="level"
        class="rounded-xl border border-[#dde1da] bg-white p-4 shadow-[0_8px_28px_rgba(31,40,32,0.04)]"
      >
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full" :class="levelPresentation[level].dotClassName" />
          <span class="font-mono text-[10px] font-bold tracking-[0.14em] text-[#747b72]">
            {{ levelPresentation[level].label }}
          </span>
        </div>
        <p class="mt-3 text-2xl font-semibold tabular-nums text-[#171a17]">
          {{ levelCounts[level] }}
        </p>
        <p class="mt-1 text-[11px] text-[#90978e]">현재 페이지</p>
      </article>
    </section>

    <section
      class="rounded-2xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(25,37,27,0.05)]"
    >
      <div class="flex items-center gap-3 border-b border-[#e4e7e1] px-5 py-4 sm:px-6">
        <span
          class="flex size-9 items-center justify-center rounded-lg bg-[#edf3e7] text-[#425238]"
        >
          <Filter class="size-4" />
        </span>
        <div>
          <h3 class="text-sm font-semibold text-[#252925]">조회 조건</h3>
          <p class="mt-0.5 text-xs text-[#7a8178]">
            범주와 이벤트는 정확히 일치하는 값으로 조회합니다.
          </p>
        </div>
        <span
          v-if="hasActiveFilters"
          class="ml-auto rounded-full bg-[#c5f277] px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.12em] text-[#26301f]"
        >
          FILTERED
        </span>
      </div>

      <form
        class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-6"
        @submit.prevent="applyFilters"
      >
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">로그 수준</span>
          <select v-model="filters.level" class="log-input">
            <option value="all">전체 수준</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">범주</span>
          <input
            v-model="filters.category"
            class="log-input"
            placeholder="예: account"
            autocomplete="off"
          />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">이벤트 식별자</span>
          <input
            v-model="filters.event"
            class="log-input"
            placeholder="예: login.failed"
            autocomplete="off"
          />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">발생 계정</span>
          <select v-model="filters.actorUserId" class="log-input">
            <option value="all">전체 계정</option>
            <option v-for="actor in actors" :key="actor.id" :value="actor.id">
              {{ actor.displayName || actor.email }}{{ actor.isActive ? '' : ' (비활성)' }}
            </option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">시작 일시</span>
          <input v-model="filters.from" type="datetime-local" class="log-input" />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold text-[#555c53]">종료 일시</span>
          <input v-model="filters.to" type="datetime-local" class="log-input" />
        </label>

        <div class="flex gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6 xl:justify-end">
          <Button
            type="button"
            variant="ghost"
            tone="neutral"
            :disabled="refreshing"
            @click="resetFilters"
          >
            <RotateCcw class="size-4" /> 초기화
          </Button>
          <Button type="submit" :disabled="refreshing">
            <Search class="size-4" /> 조건 조회
          </Button>
        </div>
      </form>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(25,37,27,0.05)]"
    >
      <div class="flex flex-wrap items-center gap-3 border-b border-[#e4e7e1] px-5 py-4 sm:px-6">
        <span
          class="flex size-9 items-center justify-center rounded-lg bg-[#151a16] text-[#c5f277]"
        >
          <Database class="size-4" />
        </span>
        <div>
          <h3 class="text-sm font-semibold text-[#252925]">저장 로그</h3>
          <p class="mt-0.5 text-xs text-[#7a8178]">최신순 · 페이지당 최대 {{ PAGE_SIZE }}건</p>
        </div>
        <p class="ml-auto font-mono text-[10px] font-semibold tracking-[0.12em] text-[#7a8178]">
          PAGE {{ pageNumber }} · {{ logs.length }} ROWS
        </p>
      </div>

      <div
        v-if="loading"
        class="flex min-h-72 items-center justify-center gap-3 text-sm text-[#737a71]"
      >
        <Loader2 class="size-5 animate-spin" /> 서버 로그를 불러오는 중입니다.
      </div>

      <div
        v-else-if="logs.length === 0"
        class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
      >
        <span
          class="flex size-12 items-center justify-center rounded-xl bg-[#edf0ea] text-[#70776e]"
        >
          <ServerCog class="size-5" />
        </span>
        <p class="mt-4 text-sm font-semibold text-[#333833]">조회된 서버 로그가 없습니다.</p>
        <p class="mt-1 text-xs text-[#828980]">조회 조건을 변경하거나 새로고침해 주세요.</p>
      </div>

      <div v-else class="relative">
        <div
          v-if="refreshing"
          class="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-[#e8ece4]"
        >
          <span class="block h-full w-1/3 animate-pulse bg-[#9cc34e]" />
        </div>

        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[980px] border-collapse text-left">
            <thead class="bg-[#f7f8f5]">
              <tr
                class="border-b border-[#e4e7e1] font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a8178]"
              >
                <th class="px-5 py-3 font-semibold sm:px-6">생성 일시 (KST)</th>
                <th class="px-4 py-3 font-semibold">수준</th>
                <th class="px-4 py-3 font-semibold">범주 / 이벤트</th>
                <th class="px-4 py-3 font-semibold">메시지</th>
                <th class="px-4 py-3 font-semibold">발생 계정</th>
                <th class="w-28 px-5 py-3 text-right font-semibold sm:px-6">상세</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eceee9]">
              <tr v-for="log in logs" :key="log.id" class="align-top transition hover:bg-[#fafbf8]">
                <td
                  class="whitespace-nowrap px-5 py-4 font-mono text-[11px] tabular-nums text-[#666d64] sm:px-6"
                >
                  {{ formatDateTime(log.createdAt) }}
                  <span class="mt-1 block text-[9px] text-[#a0a69d]">#{{ log.id }}</span>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em]"
                    :class="levelPresentation[log.level].className"
                  >
                    <span
                      class="size-1.5 rounded-full"
                      :class="levelPresentation[log.level].dotClassName"
                    />
                    {{ levelPresentation[log.level].label }}
                  </span>
                </td>
                <td class="max-w-52 px-4 py-4">
                  <p class="font-mono text-[11px] font-semibold text-[#3e463c]">
                    {{ log.category }}
                  </p>
                  <p class="mt-1 break-all font-mono text-[10px] text-[#858c82]">
                    {{ log.event || '—' }}
                  </p>
                </td>
                <td class="max-w-md px-4 py-4 text-sm leading-6 text-[#30352f]">
                  {{ log.message }}
                </td>
                <td class="max-w-56 px-4 py-4">
                  <div class="flex items-start gap-2">
                    <UserRound class="mt-0.5 size-3.5 shrink-0 text-[#8b9289]" />
                    <div class="min-w-0">
                      <p class="truncate text-xs font-semibold text-[#464d44]">
                        {{ actorLabel(log.actorUserId) }}
                      </p>
                      <p class="mt-1 truncate font-mono text-[9px] text-[#969c94]">
                        {{ actorSecondaryLabel(log.actorUserId) }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-right sm:px-6">
                  <details v-if="log.metadata || log.errorStack" class="group relative">
                    <summary
                      class="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-[#d9ddd5] px-2.5 py-1.5 text-[11px] font-semibold text-[#5e655c] hover:bg-[#f3f5f0]"
                    >
                      보기 <ChevronDown class="size-3 transition group-open:rotate-180" />
                    </summary>
                    <div
                      class="absolute right-0 z-20 mt-2 w-[34rem] max-w-[80vw] rounded-xl border border-[#cfd4cc] bg-[#171b18] p-4 text-left shadow-2xl"
                    >
                      <div v-if="log.metadata">
                        <p
                          class="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#a9b0a7]"
                        >
                          Metadata
                        </p>
                        <pre
                          class="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[#dfe5dc]"
                          >{{ formatMetadata(log.metadata) }}</pre>
                      </div>
                      <div
                        v-if="log.errorStack"
                        :class="{ 'mt-4 border-t border-white/10 pt-4': log.metadata }"
                      >
                        <p
                          class="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-red-300"
                        >
                          Error stack
                        </p>
                        <pre
                          class="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-red-100"
                          >{{ log.errorStack }}</pre>
                      </div>
                    </div>
                  </details>
                  <span v-else class="text-xs text-[#abb0a8]">없음</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-[#e5e8e2] md:hidden">
          <article v-for="log in logs" :key="log.id" class="space-y-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <span
                class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em]"
                :class="levelPresentation[log.level].className"
              >
                <span
                  class="size-1.5 rounded-full"
                  :class="levelPresentation[log.level].dotClassName"
                />
                {{ levelPresentation[log.level].label }}
              </span>
              <time class="font-mono text-[10px] tabular-nums text-[#737a71]">{{
                formatDateTime(log.createdAt)
              }}</time>
            </div>
            <div>
              <p class="font-mono text-[10px] font-semibold text-[#5a6257]">
                {{ log.category }} <span class="text-[#a0a69d]">/</span> {{ log.event || '—' }}
              </p>
              <p class="mt-2 text-sm leading-6 text-[#30352f]">{{ log.message }}</p>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[#777e75]">
              <UserRound class="size-3.5" />
              <span>{{ actorLabel(log.actorUserId) }}</span>
              <span class="ml-auto font-mono text-[9px]">#{{ log.id }}</span>
            </div>
            <details
              v-if="log.metadata || log.errorStack"
              class="group rounded-lg border border-[#dfe3dc] bg-[#f8f9f6]"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-[#5a6257]"
              >
                상세 정보 <ChevronDown class="size-3.5 transition group-open:rotate-180" />
              </summary>
              <div class="border-t border-[#dfe3dc] bg-[#171b18] p-3">
                <pre
                  v-if="log.metadata"
                  class="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#dfe5dc]"
                  >{{ formatMetadata(log.metadata) }}</pre>
                <pre
                  v-if="log.errorStack"
                  class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-white/10 pt-3 font-mono text-[10px] leading-5 text-red-100"
                  >{{ log.errorStack }}</pre>
              </div>
            </details>
          </article>
        </div>
      </div>

      <footer
        v-if="!loading && logs.length > 0"
        class="flex items-center justify-between border-t border-[#e4e7e1] px-5 py-4 sm:px-6"
      >
        <Button
          type="button"
          variant="outline"
          tone="neutral"
          size="sm"
          :disabled="cursorHistory.length === 0 || refreshing"
          @click="goToPreviousPage"
        >
          <ChevronLeft class="size-4" /> 이전
        </Button>
        <span class="font-mono text-[10px] font-semibold text-[#777e75]"
          >{{ pageNumber }} 페이지</span
        >
        <Button
          type="button"
          variant="outline"
          tone="neutral"
          size="sm"
          :disabled="!nextCursor || refreshing"
          @click="goToNextPage"
        >
          다음 <ChevronRight class="size-4" />
        </Button>
      </footer>
    </section>

    <section
      class="rounded-2xl border border-red-200 bg-white shadow-[0_12px_36px_rgba(61,25,25,0.04)]"
    >
      <div class="flex items-center gap-3 border-b border-red-100 px-5 py-4 sm:px-6">
        <span class="flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <Trash2 class="size-4" />
        </span>
        <div>
          <h3 class="text-sm font-semibold text-[#352929]">로그 비우기</h3>
          <p class="mt-0.5 text-xs text-[#827272]">
            삭제된 로그는 복구할 수 없으며, 삭제 행위 자체는 새 로그로 남습니다.
          </p>
        </div>
      </div>
      <div class="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label class="max-w-sm space-y-2">
          <span class="text-xs font-semibold text-[#655454]">기준 일자 이전 로그 삭제</span>
          <input v-model="purgeBefore" type="date" class="log-input" />
          <span class="block text-[11px] leading-5 text-[#8b7979]">
            선택일 00:00(한국 시간) 이전 로그만 삭제합니다.
          </span>
        </label>
        <div class="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Button
            type="button"
            variant="outline"
            tone="danger"
            :disabled="purging || !purgeBefore"
            @click="purgeLogsBeforeDate"
          >
            <Loader2 v-if="purgeMode === 'before'" class="size-4 animate-spin" />
            <Trash2 v-else class="size-4" />
            선택일 이전 비우기
          </Button>
          <Button
            type="button"
            variant="solid"
            tone="danger"
            :disabled="purging"
            @click="purgeAllLogs"
          >
            <Loader2 v-if="purgeMode === 'all'" class="size-4 animate-spin" />
            <Trash2 v-else class="size-4" />
            전체 비우기
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.log-input {
  width: 100%;
  min-height: 2.625rem;
  border: 1px solid #d7dcd3;
  border-radius: 0.625rem;
  background: #fbfcfa;
  padding: 0.625rem 0.75rem;
  color: #2f342e;
  font-size: 0.8125rem;
  outline: none;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    background-color 150ms ease;
}

.log-input:focus {
  border-color: #91aa61;
  background: #fff;
  box-shadow: 0 0 0 3px rgb(197 242 119 / 22%);
}

.log-input::placeholder {
  color: #a2a89f;
}
</style>
