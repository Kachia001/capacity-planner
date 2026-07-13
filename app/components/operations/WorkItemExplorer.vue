<script setup lang="ts">
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleOff,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserRound,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import HighAltitudeBadge from '@/components/operations/HighAltitudeBadge.vue'
import WorkStatusBadge from '@/components/operations/WorkStatusBadge.vue'
import type { AppRole } from '@/stores/auth'
import type {
  BayOption,
  OperationWorkItem,
  WorkItemSearchFilters,
  WorkItemStatus,
} from '@/types/operations'

const props = defineProps<{
  role: AppRole
  currentUserId: string
  bays: BayOption[]
  selectedBayId: string | null
  items: OperationWorkItem[]
  filters: WorkItemSearchFilters
  total: number
  nextCursor: string | null
  pending: boolean
  loadingMore: boolean
  mutationItemId: number | null
  focusedWorkItemId: number | null
  errorMessage: string | null
  noticeMessage: string | null
  noticeTone: 'success' | 'error'
  title: string
  description: string
}>()

const emit = defineEmits<{
  selectBay: [bayId: string]
  updateSearch: [value: string]
  updateStatus: [value: WorkItemStatus | 'all']
  updateHighAltitude: [value: boolean | null]
  updateHasIssue: [value: boolean | null]
  start: [item: OperationWorkItem]
  complete: [item: OperationWorkItem]
  cancelStart: [item: OperationWorkItem]
  void: [item: OperationWorkItem]
  clearFocus: []
  loadMore: []
  retry: []
}>()

const selectedBay = computed(
  () => props.bays.find(candidate => candidate.id === props.selectedBayId) ?? null,
)
const isSupervisor = computed(() => props.role === 'admin' || props.role === 'manager')

function handleBayChange(event: Event) {
  emit('selectBay', (event.target as HTMLSelectElement).value)
}

function handleSearchInput(event: Event) {
  emit('updateSearch', (event.target as HTMLInputElement).value)
}

function handleStatusChange(event: Event) {
  emit('updateStatus', (event.target as HTMLSelectElement).value as WorkItemStatus | 'all')
}

function toggleHighAltitude() {
  emit('updateHighAltitude', props.filters.highAltitude === true ? null : true)
}

function toggleHasIssue() {
  emit('updateHasIssue', props.filters.hasIssue === true ? null : true)
}

function requestStart(item: OperationWorkItem) {
  emit('start', item)
}

function requestComplete(item: OperationWorkItem) {
  emit('complete', item)
}

function requestCancelStart(item: OperationWorkItem) {
  emit('cancelStart', item)
}

function requestVoid(item: OperationWorkItem) {
  emit('void', item)
}

function requestClearFocus() {
  emit('clearFocus')
}

function requestLoadMore() {
  emit('loadMore')
}

function requestRetry() {
  emit('retry')
}

function canComplete(item: OperationWorkItem) {
  return isSupervisor.value || item.startedBy === props.currentUserId
}

function displayValue(value: string | number | null | undefined, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '기록 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function workerLabel(item: OperationWorkItem) {
  return item.startedByName || item.worker || item.startedByEmail || '담당자 미확인'
}

function severityLabel(item: OperationWorkItem) {
  if (item.issueSeverity === 'critical') return '긴급 이슈'
  if (item.issueSeverity === 'high') return '중요 이슈'
  if (item.issueSeverity === 'low') return '경미 이슈'
  return '이슈 있음'
}
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div
      class="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_22px_70px_-50px_rgba(15,23,42,0.55)]"
    >
      <header class="border-b border-zinc-200 bg-[#f8faf7] px-4 py-5 sm:px-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              Bay work item explorer
            </p>
            <h2 class="mt-2 text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
              {{ props.title }}
            </h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
              {{ props.description }}
            </p>
          </div>
          <div
            v-if="selectedBay"
            class="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <span
              class="flex size-9 items-center justify-center rounded-sm bg-emerald-700 text-white"
            >
              <MapPin class="size-4" />
            </span>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                Active Bay
              </p>
              <p class="mt-0.5 font-mono text-sm font-bold text-emerald-950">
                {{ selectedBay.code }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-[14rem_minmax(18rem,1fr)_11rem_auto]">
          <label class="relative">
            <span class="sr-only">Bay 선택</span>
            <select
              :value="props.selectedBayId ?? ''"
              class="h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              @change="handleBayChange"
            >
              <option value="" disabled>Bay를 선택하세요</option>
              <option v-for="bay in props.bays" :key="bay.id" :value="bay.id">
                {{ bay.code }}
              </option>
            </select>
            <ChevronDown
              class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            />
          </label>

          <label class="relative">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            />
            <span class="sr-only">상세 작업 검색</span>
            <input
              type="search"
              :value="props.filters.q"
              :disabled="!props.selectedBayId"
              placeholder="작업명, 상세 작업, 품번, 품명, 업체 검색"
              class="h-11 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
              @input="handleSearchInput"
            />
          </label>

          <label class="relative">
            <span class="sr-only">작업 상태</span>
            <select
              :value="props.filters.status"
              :disabled="!props.selectedBayId"
              class="h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-9 text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100"
              @change="handleStatusChange"
            >
              <option value="all">전체 상태</option>
              <option value="not_started">미작업</option>
              <option value="in_progress">작업 중</option>
              <option value="completed">작업 완료</option>
            </select>
            <ChevronDown
              class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            />
          </label>

          <div class="flex gap-2">
            <button
              type="button"
              :disabled="!props.selectedBayId"
              class="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-xs font-bold transition disabled:opacity-40"
              :class="
                props.filters.highAltitude
                  ? 'border-amber-400 bg-amber-100 text-amber-950'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
              "
              @click="toggleHighAltitude"
            >
              <ShieldAlert class="size-4" /> 고소작업
            </button>
            <button
              type="button"
              :disabled="!props.selectedBayId"
              class="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-xs font-bold transition disabled:opacity-40"
              :class="
                props.filters.hasIssue
                  ? 'border-red-300 bg-red-100 text-red-900'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
              "
              @click="toggleHasIssue"
            >
              <AlertCircle class="size-4" /> 이슈 있음
            </button>
          </div>
        </div>
      </header>

      <div
        v-if="props.noticeMessage"
        role="status"
        class="border-b px-4 py-3 text-sm font-semibold sm:px-6"
        :class="
          props.noticeTone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-red-200 bg-red-50 text-red-900'
        "
      >
        {{ props.noticeMessage }}
      </div>

      <div
        v-if="props.focusedWorkItemId"
        role="status"
        class="flex flex-col gap-3 border-b border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <p>
          <strong>선택한 작업 #{{ props.focusedWorkItemId }}</strong
          >만 표시하고 있습니다. 대시보드에서 선택한 이슈 또는 활동의 작업입니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          class="h-9 shrink-0 border-sky-300 bg-white text-sky-800 hover:bg-sky-100"
          @click="requestClearFocus"
        >
          전체 작업 보기
        </Button>
      </div>

      <div
        v-if="!props.selectedBayId"
        class="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"
      >
        <span
          class="flex size-14 items-center justify-center rounded-full border border-dashed border-emerald-400 bg-emerald-50 text-emerald-700"
        >
          <MapPin class="size-6" />
        </span>
        <h3 class="mt-5 text-lg font-semibold text-zinc-950">먼저 작업할 Bay를 선택하세요.</h3>
        <p class="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Bay를 선택하면 해당 Bay 내부의 상세 작업만 안전하게 검색하고 처리할 수 있습니다.
        </p>
      </div>

      <div
        v-else-if="props.errorMessage"
        class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
      >
        <AlertCircle class="size-8 text-red-600" />
        <h3 class="mt-4 font-semibold text-zinc-950">작업 목록을 불러오지 못했습니다.</h3>
        <p class="mt-2 max-w-lg text-sm text-red-700">{{ props.errorMessage }}</p>
        <Button variant="outline" class="mt-5 h-10 gap-2" @click="requestRetry">
          <RefreshCw class="size-4" /> 다시 시도
        </Button>
      </div>

      <div
        v-else-if="props.pending"
        class="flex min-h-80 items-center justify-center text-sm text-zinc-500"
      >
        <Loader2 class="mr-2 size-5 animate-spin text-emerald-600" /> 상세 작업을 검색하고 있습니다.
      </div>

      <div v-else class="p-4 sm:p-6">
        <div
          class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4"
        >
          <p class="text-sm text-zinc-600">
            검색 결과 <strong class="font-semibold text-zinc-950">{{ props.total }}</strong
            >건
          </p>
          <p v-if="props.role === 'worker'" class="text-xs font-medium text-amber-800">
            작업 시작 후에는 작업자가 직접 취소할 수 없습니다.
          </p>
        </div>

        <div
          v-if="props.items.length === 0"
          class="flex min-h-64 flex-col items-center justify-center text-center"
        >
          <CircleOff class="size-8 text-zinc-400" />
          <h3 class="mt-4 font-semibold text-zinc-900">조건에 맞는 상세 작업이 없습니다.</h3>
          <p class="mt-2 text-sm text-zinc-500">검색어나 상태 필터를 바꿔보세요.</p>
        </div>

        <div v-else class="grid gap-4 xl:grid-cols-2">
          <article
            v-for="item in props.items"
            :id="`work-item-${item.id}`"
            :key="item.id"
            tabindex="-1"
            class="group flex min-h-[20rem] flex-col overflow-hidden rounded-md border bg-[#fdfefc] transition duration-200"
            :class="[
              item.isHighAltitude
                ? 'border-amber-300 shadow-[0_16px_40px_-32px_rgba(146,64,14,0.55)]'
                : 'border-zinc-200 hover:border-emerald-300 hover:shadow-[0_16px_40px_-34px_rgba(5,150,105,0.45)]',
              props.focusedWorkItemId === item.id
                ? 'border-sky-500 ring-4 ring-sky-100 shadow-[0_20px_50px_-30px_rgba(2,132,199,0.7)] focus:outline-none'
                : '',
            ]"
          >
            <div
              class="flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400"
                >
                  ITEM {{ String(item.sortOrder).padStart(3, '0') }}
                </span>
                <WorkStatusBadge :status="item.status" />
                <HighAltitudeBadge :active="item.isHighAltitude" compact />
                <span
                  v-if="item.hasIssue && item.issueStatus !== 'resolved'"
                  class="inline-flex h-6 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-800"
                >
                  <AlertCircle class="size-3.5" /> {{ severityLabel(item) }}
                </span>
              </div>
              <span class="flex shrink-0 items-center gap-2">
                <span
                  v-if="props.focusedWorkItemId === item.id"
                  class="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800"
                >
                  선택됨
                </span>
                <span class="font-mono text-xs font-bold text-zinc-500">#{{ item.id }}</span>
              </span>
            </div>

            <div class="flex flex-1 flex-col p-4">
              <div>
                <p class="text-xs font-semibold text-emerald-700">
                  Work No. {{ displayValue(item.workNo) }}
                </p>
                <h3 class="mt-1 text-lg font-semibold leading-6 tracking-[-0.015em] text-zinc-950">
                  {{ displayValue(item.workName, '작업명 없음') }}
                </h3>
                <p class="mt-2 min-h-10 text-sm leading-6 text-zinc-600">
                  {{ displayValue(item.workDetail, '상세 작업 내용이 없습니다.') }}
                </p>
              </div>

              <dl
                class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-zinc-200 py-4 text-sm sm:grid-cols-3"
              >
                <div>
                  <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    품번
                  </dt>
                  <dd class="mt-1 break-all font-mono font-semibold text-zinc-800">
                    {{ displayValue(item.partNo) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    품명
                  </dt>
                  <dd class="mt-1 font-semibold text-zinc-800">
                    {{ displayValue(item.itemName) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    업체
                  </dt>
                  <dd class="mt-1 font-semibold text-zinc-800">{{ displayValue(item.vendor) }}</dd>
                </div>
              </dl>

              <div
                v-if="item.isHighAltitude"
                class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
              >
                <p class="flex items-center gap-2 font-bold">
                  <ShieldAlert class="size-4" /> 고소작업 안전 참고
                </p>
                <p class="mt-1.5 leading-5 text-amber-900/80">
                  {{
                    displayValue(
                      item.safetyNote,
                      '별도 참고사항 없음 · 현장 안전수칙을 확인하세요.',
                    )
                  }}
                </p>
              </div>

              <div
                v-if="item.hasIssue && item.issueNote"
                class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900"
              >
                <p class="font-bold">이슈 내용</p>
                <p class="mt-1 leading-5">{{ item.issueNote }}</p>
              </div>

              <div class="mt-auto pt-5">
                <div
                  v-if="item.status !== 'not_started'"
                  class="mb-3 flex items-center justify-between gap-3 rounded-md bg-zinc-100 px-3 py-2.5 text-xs text-zinc-600"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <UserRound class="size-4 shrink-0" />
                    <strong class="truncate font-semibold text-zinc-900">{{
                      workerLabel(item)
                    }}</strong>
                  </span>
                  <span class="shrink-0 font-mono">{{ formatDateTime(item.startedAt) }}</span>
                </div>

                <div class="flex flex-wrap justify-end gap-2">
                  <Button
                    v-if="props.role === 'admin'"
                    variant="destructive"
                    class="h-10 px-3"
                    :disabled="props.mutationItemId !== null"
                    @click="requestVoid(item)"
                  >
                    <CircleOff class="size-4" /> 무효화
                  </Button>
                  <Button
                    v-if="isSupervisor && item.status === 'in_progress'"
                    variant="outline"
                    class="h-10 border-amber-300 px-3 text-amber-800 hover:bg-amber-50"
                    :disabled="props.mutationItemId !== null"
                    @click="requestCancelStart(item)"
                  >
                    <RotateCcw class="size-4" /> 시작 취소
                  </Button>
                  <Button
                    v-if="item.status === 'not_started'"
                    class="h-10 bg-emerald-700 px-4 text-white hover:bg-emerald-600"
                    :disabled="props.mutationItemId !== null"
                    @click="requestStart(item)"
                  >
                    <Loader2 v-if="props.mutationItemId === item.id" class="size-4 animate-spin" />
                    <Check v-else class="size-4" /> 작업 시작
                  </Button>
                  <Button
                    v-else-if="item.status === 'in_progress' && canComplete(item)"
                    class="h-10 bg-zinc-950 px-4 text-white hover:bg-zinc-800"
                    :disabled="props.mutationItemId !== null"
                    @click="requestComplete(item)"
                  >
                    <Loader2 v-if="props.mutationItemId === item.id" class="size-4 animate-spin" />
                    <Check v-else class="size-4" /> 작업 완료
                  </Button>
                  <span
                    v-else-if="item.status === 'in_progress'"
                    class="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-500"
                  >
                    다른 작업자가 진행 중
                  </span>
                  <span
                    v-else
                    class="inline-flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"
                  >
                    완료 처리됨
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="props.nextCursor" class="mt-6 flex justify-center border-t border-zinc-200 pt-5">
          <Button
            variant="outline"
            class="h-10 min-w-36 gap-2"
            :disabled="props.loadingMore"
            @click="requestLoadMore"
          >
            <Loader2 v-if="props.loadingMore" class="size-4 animate-spin" />
            {{ props.loadingMore ? '불러오는 중' : '다음 작업 보기' }}
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
