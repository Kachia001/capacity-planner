<script setup lang="ts">
import {
  ArrowUpRight,
  Boxes,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/table'
import type { DataTableColumn, DataTableOptions } from '@/components/ui/table'
import { fetchOperationsDashboard, getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { DashboardBaySummary, OperationsDashboardResponse } from '@/types/operations'

definePageMeta({
  middleware: ['auth-client', 'role-client'],
  roles: ['manager'],
})
useHead({ title: 'Bay 목록 · Capacity Planner Manager' })

type BayStateFilter = 'all' | 'waiting' | 'in_progress' | 'completed' | 'empty'
type IssueFilter = 'all' | 'with_issue' | 'without_issue'

interface BayFilters {
  query: string
  state: BayStateFilter
  issue: IssueFilter
}

const auth = useAuthStore()
const route = useRoute()
const initialQuery = typeof route.query.q === 'string' ? route.query.q : ''
const dashboard = ref<OperationsDashboardResponse | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref<string | null>(null)
const formFilters = reactive<BayFilters>({ query: initialQuery, state: 'all', issue: 'all' })
const activeFilters = ref<BayFilters>({ query: initialQuery, state: 'all', issue: 'all' })

const filteredBays = computed(() => {
  const query = activeFilters.value.query.trim().toLocaleLowerCase()

  return (dashboard.value?.bays ?? []).filter(bay => {
    const matchesQuery =
      !query ||
      bay.code.toLocaleLowerCase().includes(query) ||
      bay.description?.toLocaleLowerCase().includes(query)
    const state = getBayState(bay)
    const matchesState = activeFilters.value.state === 'all' || activeFilters.value.state === state
    const matchesIssue =
      activeFilters.value.issue === 'all' ||
      (activeFilters.value.issue === 'with_issue' ? bay.openIssues > 0 : bay.openIssues === 0)

    return Boolean(matchesQuery && matchesState && matchesIssue)
  })
})

const totalItems = computed(() => dashboard.value?.summary.totalItems ?? 0)
const activeBayCount = computed(
  () => dashboard.value?.bays.filter(bay => bay.inProgress > 0).length ?? 0,
)
const completeBayCount = computed(() => dashboard.value?.summary.completeBays ?? 0)

function getBayState(bay: DashboardBaySummary): Exclude<BayStateFilter, 'all'> {
  if (bay.total === 0) return 'empty'
  if (bay.completed === bay.total) return 'completed'
  if (bay.inProgress > 0) return 'in_progress'
  return 'waiting'
}

function getBayStateLabel(bay: DashboardBaySummary) {
  const labels: Record<Exclude<BayStateFilter, 'all'>, string> = {
    empty: '작업 미등록',
    completed: '작업 완료',
    in_progress: '작업 중',
    waiting: '작업 대기',
  }

  return labels[getBayState(bay)]
}

function getBayStateClass(bay: DashboardBaySummary) {
  const classes: Record<Exclude<BayStateFilter, 'all'>, string> = {
    empty: 'border-zinc-200 bg-zinc-100 text-zinc-600',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
    waiting: 'border-sky-200 bg-sky-50 text-sky-800',
  }

  return classes[getBayState(bay)]
}

function getBayAccentClass(bay: DashboardBaySummary) {
  const classes: Record<Exclude<BayStateFilter, 'all'>, string> = {
    empty: 'bg-zinc-400',
    completed: 'bg-emerald-500',
    in_progress: 'bg-amber-500',
    waiting: 'bg-sky-500',
  }

  return classes[getBayState(bay)]
}

function formatActivity(value: string | null) {
  if (!value) return '활동 기록 없음'

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

const bayTableColumns: DataTableColumn<DashboardBaySummary>[] = [
  {
    key: 'bay',
    header: 'Bay 정보',
    accessor: 'code',
    width: '19%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'state',
    header: '운영 상태',
    accessor: getBayState,
    width: '11%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'progress',
    header: '작업 진행률',
    accessor: 'completionRate',
    width: '25%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'work',
    header: '작업 현황',
    accessor: 'total',
    width: '16%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'people',
    header: '이슈 / 인원',
    accessor: 'openIssues',
    width: '9%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'activity',
    header: '최근 활동',
    accessor: 'lastActivityAt',
    width: '13%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
  {
    key: 'detail',
    header: '상세',
    accessor: 'id',
    align: 'right',
    width: '7%',
    headerClass: 'text-[11px] font-semibold text-[#697067]',
  },
]

const bayTableOptions: DataTableOptions<DashboardBaySummary> = {
  tableClass: 'min-w-[64rem] border-collapse text-left',
  headerClass: 'bg-[#f7f8f5]',
  headerRowClass: 'border-b border-[#e0e4dd]',
  bodyClass: 'divide-y divide-[#eceee9]',
  rowClass: 'group transition hover:bg-[#fbfcf9]',
}

function applyFilters() {
  activeFilters.value = { ...formFilters }
}

function resetFilters() {
  formFilters.query = ''
  formFilters.state = 'all'
  formFilters.issue = 'all'
  applyFilters()
}

async function loadBays(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = null

  try {
    await auth.initialize()
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    dashboard.value = await fetchOperationsDashboard(accessToken)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Bay 목록을 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => {
  void loadBays()
})
</script>

<template>
  <main class="min-h-[calc(100vh-4rem)] bg-[#f6f8f4]">
    <div class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]"
            >
              Manager / Bay operations
            </p>
            <h1
              class="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#171a17] sm:text-[2rem]"
            >
              Bay 운영 현황
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
              전체 Bay의 작업 진행률과 이슈, 현재 작업 인원을 빠르게 확인합니다.
            </p>
          </div>

          <dl
            class="grid w-full grid-cols-3 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(24,35,26,0.05)] lg:w-auto lg:min-w-[28rem]"
          >
            <div class="border-r border-[#e4e7e1] px-3 py-3.5 sm:px-5 sm:py-4">
              <dt class="text-[9px] text-[#858d82] sm:text-[10px]">전체 Bay</dt>
              <dd class="mt-1 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
                {{ dashboard?.summary.totalBays ?? 0 }}
              </dd>
            </div>
            <div class="border-r border-[#e4e7e1] px-3 py-3.5 sm:px-5 sm:py-4">
              <dt class="text-[9px] text-[#858d82] sm:text-[10px]">작업 중</dt>
              <dd class="mt-1 text-xl font-semibold tracking-[-0.04em] text-amber-700 sm:text-2xl">
                {{ activeBayCount }}
              </dd>
            </div>
            <div class="px-3 py-3.5 sm:px-5 sm:py-4">
              <dt class="text-[9px] text-[#858d82] sm:text-[10px]">완료 Bay</dt>
              <dd
                class="mt-1 text-xl font-semibold tracking-[-0.04em] text-emerald-700 sm:text-2xl"
              >
                {{ completeBayCount }}
              </dd>
            </div>
          </dl>
        </div>

        <form
          class="mt-5 rounded-xl border border-[#d9ddd5] bg-[#fafbf8] p-4 shadow-[0_10px_30px_rgba(24,35,26,0.035)] sm:mt-7 sm:p-5"
          @submit.prevent="applyFilters"
        >
          <div class="flex items-center justify-between border-b border-[#e2e5df] pb-4">
            <div>
              <h2 class="text-sm font-semibold">조회 조건</h2>
              <p class="mt-1 text-xs text-[#858c83]">
                Bay 코드, 설명, 운영 상태와 이슈 여부로 검색합니다.
              </p>
            </div>
            <span
              class="hidden font-mono text-[9px] uppercase tracking-[0.17em] text-[#9aa198] sm:block"
            >
              Search form
            </span>
          </div>

          <div
            class="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.4fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_auto]"
          >
            <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
              Bay 코드 / 설명
              <span class="relative block">
                <Search
                  class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#92998f]"
                />
                <input
                  v-model="formFilters.query"
                  type="search"
                  class="h-11 w-full rounded-lg border border-[#d6dad2] bg-white pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-[#acb2aa] focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
                  placeholder="예: BAY-A01 또는 조립"
                />
              </span>
            </label>

            <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
              운영 상태
              <select
                v-model="formFilters.state"
                class="h-11 rounded-lg border border-[#d6dad2] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              >
                <option value="all">전체</option>
                <option value="waiting">작업 대기</option>
                <option value="in_progress">작업 중</option>
                <option value="completed">작업 완료</option>
                <option value="empty">작업 미등록</option>
              </select>
            </label>

            <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
              이슈 여부
              <select
                v-model="formFilters.issue"
                class="h-11 rounded-lg border border-[#d6dad2] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              >
                <option value="all">전체</option>
                <option value="with_issue">이슈 있음</option>
                <option value="without_issue">이슈 없음</option>
              </select>
            </label>

            <div class="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                tone="neutral"
                size="lg"
                class="border-[#d6dad2] bg-white text-xs text-[#60675f] hover:border-[#aeb5ab] hover:text-[#171a17]"
                @click="resetFilters"
              >
                <RotateCcw class="size-3.5" /> 초기화
              </Button>
              <Button
                type="submit"
                variant="solid"
                tone="neutral"
                size="lg"
                class="text-xs shadow-[0_8px_20px_rgba(23,27,24,0.14)]"
              >
                <Search class="size-3.5" /> 조회
              </Button>
            </div>
          </div>
        </form>

        <div class="my-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            tone="neutral"
            size="md"
            :loading="refreshing"
            loading-text="동기화 중"
            class="border-[#d9ddd5] bg-white text-xs text-[#697067] hover:border-[#aeb5ab] hover:text-[#171a17]"
            @click="loadBays(true)"
          >
            <RefreshCw class="size-3.5" />
            최신 정보
          </Button>
        </div>

        <section
          class="overflow-hidden rounded-xl border border-[#d6dad2] bg-white shadow-[0_14px_40px_rgba(24,35,26,0.055)]"
        >
          <div
            class="flex h-14 items-center justify-between border-b border-[#e0e4dd] px-4 sm:px-5"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex size-8 items-center justify-center rounded-md bg-[#eef3e9] text-[#526348]"
              >
                <Boxes class="size-4" />
              </span>
              <div>
                <h2 class="text-sm font-semibold">Bay 목록</h2>
                <p class="mt-0.5 text-[10px] text-[#8b9289] sm:text-[11px]">
                  총 작업 {{ totalItems.toLocaleString('ko-KR') }}건
                </p>
              </div>
            </div>
            <p class="text-xs text-[#777f76]">
              결과
              <strong class="font-mono text-[#20251f]">{{ filteredBays.length }}</strong
              >건
            </p>
          </div>

          <div
            v-if="loading"
            class="flex min-h-72 items-center justify-center px-6 text-center text-sm text-[#777f76]"
          >
            <Loader2 class="mr-2 size-5 shrink-0 animate-spin text-[#6f845e]" />
            Bay 정보를 불러오는 중입니다.
          </div>

          <div
            v-else-if="errorMessage"
            class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
          >
            <TriangleAlert class="size-8 text-red-600" />
            <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
            <Button
              type="button"
              variant="outline"
              tone="danger"
              size="sm"
              class="mt-4 border-red-200 text-xs text-red-700 hover:bg-red-50"
              @click="loadBays()"
            >
              <RefreshCw class="size-3.5" /> 다시 시도
            </Button>
          </div>

          <div
            v-else-if="filteredBays.length === 0"
            class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
          >
            <span
              class="flex size-12 items-center justify-center rounded-xl bg-[#f1f3ef] text-[#7e877b]"
            >
              <Search class="size-5" />
            </span>
            <p class="mt-4 text-sm font-semibold">조건에 맞는 Bay가 없습니다.</p>
            <p class="mt-1 text-xs text-[#8a9188]">검색 조건을 변경해 주세요.</p>
          </div>

          <template v-else>
            <div class="space-y-3 bg-[#edf1ea] p-3 md:hidden" data-testid="manager-bay-cards">
              <article
                v-for="bay in filteredBays"
                :key="bay.id"
                class="relative overflow-hidden rounded-xl border border-[#d8ddd4] bg-white p-4 pl-5 shadow-[0_8px_24px_rgba(29,43,31,0.08)]"
              >
                <span
                  class="absolute inset-y-0 left-0 w-1"
                  :class="getBayAccentClass(bay)"
                  aria-hidden="true"
                />
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p
                      class="mb-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-[#98a095]"
                    >
                      Bay information
                    </p>
                    <p class="break-all font-mono text-sm font-bold text-[#1d241c]">
                      {{ bay.code }}
                    </p>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-[#858c83]">
                      {{ bay.description || '등록된 설명이 없습니다.' }}
                    </p>
                  </div>
                  <span
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                    :class="getBayStateClass(bay)"
                  >
                    <span class="size-1.5 rounded-full bg-current opacity-75" />
                    {{ getBayStateLabel(bay) }}
                  </span>
                </div>

                <div class="mt-4">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-[#495147]">작업 진행률</span>
                    <strong class="font-mono text-[#293328]">{{ bay.completionRate }}%</strong>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#e9ece6]">
                    <div
                      class="h-full rounded-full bg-[#7da554]"
                      :style="{ width: `${bay.completionRate}%` }"
                    />
                  </div>
                  <p class="mt-1.5 text-[10px] text-[#949b92]">
                    완료 {{ bay.completed }} / 전체 {{ bay.total }}
                  </p>
                </div>

                <dl
                  class="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-[#e0e4dd]"
                >
                  <div class="border-r border-[#e0e4dd] px-3 py-2.5">
                    <dt class="text-[9px] text-[#8b9289]">대기</dt>
                    <dd class="mt-1 font-mono text-sm font-bold">{{ bay.notStarted }}</dd>
                  </div>
                  <div class="border-r border-[#e0e4dd] px-3 py-2.5">
                    <dt class="text-[9px] text-amber-700">진행</dt>
                    <dd class="mt-1 font-mono text-sm font-bold text-amber-700">
                      {{ bay.inProgress }}
                    </dd>
                  </div>
                  <div class="px-3 py-2.5">
                    <dt class="text-[9px] text-emerald-700">완료</dt>
                    <dd class="mt-1 font-mono text-sm font-bold text-emerald-700">
                      {{ bay.completed }}
                    </dd>
                  </div>
                </dl>

                <div class="mt-4 border-t border-[#e9ece6] pt-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center rounded-md bg-[#f3f5f1] px-2 py-1 text-[10px] text-[#687066]"
                    >
                      이슈
                      <strong
                        class="ml-1"
                        :class="bay.openIssues ? 'text-red-700' : 'text-[#30362f]'"
                      >
                        {{ bay.openIssues }}
                      </strong>
                    </span>
                    <span
                      class="inline-flex items-center rounded-md bg-[#f3f5f1] px-2 py-1 text-[10px] text-[#687066]"
                    >
                      작업 인원 <strong class="ml-1 text-[#30362f]">{{ bay.activeWorkers }}</strong>
                    </span>
                  </div>

                  <div class="mt-3 flex items-center justify-between gap-3">
                    <p class="truncate font-mono text-[10px] text-[#8b9289]">
                      최근 활동 {{ formatActivity(bay.lastActivityAt) }}
                    </p>
                    <Button
                      as-child
                      variant="solid"
                      tone="neutral"
                      size="md"
                      class="shrink-0 text-[11px] shadow-sm"
                    >
                      <NuxtLink
                        :to="{ path: '/bay', query: { targetBay: bay.code } }"
                        :aria-label="`${bay.code} 상세 운영 보기`"
                      >
                        운영 보기 <ArrowUpRight class="size-3.5" />
                      </NuxtLink>
                    </Button>
                  </div>
                </div>
              </article>
            </div>

            <section data-layout="desktop" class="hidden md:block" data-testid="manager-bay-table">
              <DataTable
                :data="filteredBays"
                :columns="bayTableColumns"
                :options="bayTableOptions"
                row-key="id"
              >
                <template #cell-bay="{ row }">
                  <p class="font-mono text-[13px] font-bold tracking-[-0.01em] text-[#1d241c]">
                    {{ row.code }}
                  </p>
                  <p class="mt-1 max-w-[17rem] truncate text-xs text-[#858c83]">
                    {{ row.description || '등록된 설명이 없습니다.' }}
                  </p>
                </template>

                <template #cell-state="{ row }">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                    :class="getBayStateClass(row)"
                  >
                    <span class="size-1.5 rounded-full bg-current opacity-75" />
                    {{ getBayStateLabel(row) }}
                  </span>
                </template>

                <template #cell-progress="{ row }">
                  <div class="flex items-center justify-between gap-3">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9ece6]">
                      <div
                        class="h-full rounded-full bg-[#7da554]"
                        :style="{ width: `${row.completionRate}%` }"
                      />
                    </div>
                    <span
                      class="w-10 text-right font-mono text-[11px] font-semibold text-[#495147]"
                    >
                      {{ row.completionRate }}%
                    </span>
                  </div>
                  <p class="mt-1.5 text-[10px] text-[#949b92]">
                    완료 {{ row.completed }} / 전체 {{ row.total }}
                  </p>
                </template>

                <template #cell-work="{ row }">
                  <div class="flex items-center gap-3 text-[11px]">
                    <span class="text-[#777e75]">
                      대기 <strong class="ml-1 text-[#30362f]">{{ row.notStarted }}</strong>
                    </span>
                    <span class="text-amber-700">
                      진행 <strong class="ml-1">{{ row.inProgress }}</strong>
                    </span>
                    <span class="text-emerald-700">
                      완료 <strong class="ml-1">{{ row.completed }}</strong>
                    </span>
                  </div>
                </template>

                <template #cell-people="{ row }">
                  <p class="text-[11px] text-[#737a71]">
                    이슈
                    <strong :class="row.openIssues ? 'text-red-700' : 'text-[#30362f]'">
                      {{ row.openIssues }}
                    </strong>
                    <span class="mx-1 text-[#c0c5bd]">/</span>
                    인원 <strong class="text-[#30362f]">{{ row.activeWorkers }}</strong>
                  </p>
                </template>

                <template #cell-activity="{ row }">
                  <p class="font-mono text-[10px] text-[#697067]">
                    {{ formatActivity(row.lastActivityAt) }}
                  </p>
                </template>

                <template #cell-detail="{ row }">
                  <Button
                    as-child
                    variant="ghost"
                    tone="neutral"
                    size="icon"
                    class="text-[#7a8278] group-hover:bg-white group-hover:text-[#263022]"
                  >
                    <NuxtLink
                      :to="{ path: '/bay', query: { targetBay: row.code } }"
                      :aria-label="`${row.code} 상세 운영 보기`"
                    >
                      <ArrowUpRight class="size-4" />
                    </NuxtLink>
                  </Button>
                </template>
              </DataTable>
            </section>
          </template>
        </section>
      </section>
    </div>
  </main>
</template>
