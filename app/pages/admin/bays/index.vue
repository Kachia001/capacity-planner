<script setup lang="ts">
import {
  ArrowUpRight,
  Boxes,
  FilePlus2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
} from '@lucide/vue'
import { fetchOperationsDashboard, getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { DashboardBaySummary, OperationsDashboardResponse } from '@/types/operations'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: 'Bay 조회 · Capacity Planner Admin' })

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
  <div class="mx-auto w-full max-w-[100rem] px-8 py-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div
        class="flex flex-col items-stretch gap-6 xl:flex-row xl:items-end xl:justify-between xl:gap-8"
      >
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Bay registry / live operations
          </p>
          <h2 class="mt-2 text-[2rem] font-semibold tracking-[-0.045em] text-[#171a17]">
            Bay를 조회하고 운영 상태를 확인합니다.
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            등록된 Bay의 작업 진행률과 이슈, 현재 작업 인원을 한 목록에서 확인할 수 있습니다.
          </p>
        </div>

        <dl
          class="grid w-full grid-cols-3 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(24,35,26,0.05)] xl:w-auto xl:min-w-[28rem]"
        >
          <div class="border-r border-[#e4e7e1] px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">
              전체 Bay
            </dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em]">
              {{ dashboard?.summary.totalBays ?? 0 }}
            </dd>
          </div>
          <div class="border-r border-[#e4e7e1] px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">작업 중</dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-amber-700">
              {{ activeBayCount }}
            </dd>
          </div>
          <div class="px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">
              완료 Bay
            </dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-emerald-700">
              {{ completeBayCount }}
            </dd>
          </div>
        </dl>
      </div>

      <form
        class="mt-8 rounded-xl border border-[#d9ddd5] bg-[#fafbf8] p-5 shadow-[0_10px_30px_rgba(24,35,26,0.035)]"
        @submit.prevent="applyFilters"
      >
        <div class="flex items-center justify-between border-b border-[#e2e5df] pb-4">
          <div>
            <h3 class="text-sm font-semibold">조회 조건</h3>
            <p class="mt-1 text-xs text-[#858c83]">Bay 코드 또는 설명과 운영 상태로 검색합니다.</p>
          </div>
          <span class="font-mono text-[9px] uppercase tracking-[0.17em] text-[#9aa198]">
            Search form
          </span>
        </div>

        <div
          class="mt-4 grid grid-cols-2 items-end gap-4 xl:grid-cols-[minmax(18rem,1.4fr)_minmax(11rem,0.7fr)_minmax(11rem,0.7fr)_auto]"
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

          <div class="col-span-2 flex items-center justify-end gap-2 xl:col-span-1">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d6dad2] bg-white px-4 text-xs font-semibold text-[#60675f] transition hover:border-[#aeb5ab] hover:text-[#171a17]"
              @click="resetFilters"
            >
              <RotateCcw class="size-3.5" /> 초기화
            </button>
            <button
              type="submit"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#171b18] px-5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(23,27,24,0.14)] transition hover:bg-[#2d352e]"
            >
              <Search class="size-3.5" /> 조회
            </button>
          </div>
        </div>
      </form>

      <div class="my-5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/admin/bays/new"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#bdea70] px-4 text-xs font-bold text-[#172014] shadow-[0_8px_18px_rgba(100,130,61,0.13)] transition hover:bg-[#c8f480]"
          >
            <Plus class="size-4" /> Bay 생성
          </NuxtLink>
          <NuxtLink
            to="/admin/bay-templates/new"
            class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cdd2c9] bg-white px-4 text-xs font-semibold text-[#414840] transition hover:border-[#949d91] hover:bg-[#fafbf8]"
          >
            <FilePlus2 class="size-4" /> Bay Template 생성
          </NuxtLink>
        </div>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[#697067] transition hover:bg-white hover:text-[#171a17] disabled:opacity-50"
          :disabled="refreshing"
          @click="loadBays(true)"
        >
          <RefreshCw class="size-3.5" :class="refreshing ? 'animate-spin' : ''" />
          최신 정보
        </button>
      </div>

      <section
        class="overflow-hidden rounded-xl border border-[#d6dad2] bg-white shadow-[0_14px_40px_rgba(24,35,26,0.055)]"
      >
        <div class="flex h-14 items-center justify-between border-b border-[#e0e4dd] px-5">
          <div class="flex items-center gap-3">
            <span
              class="flex size-8 items-center justify-center rounded-md bg-[#eef3e9] text-[#526348]"
            >
              <Boxes class="size-4" />
            </span>
            <div>
              <h3 class="text-sm font-semibold">Bay 목록</h3>
              <p class="mt-0.5 text-[11px] text-[#8b9289]">
                총 작업 {{ totalItems.toLocaleString('ko-KR') }}건
              </p>
            </div>
          </div>
          <p class="text-xs text-[#777f76]">
            조회 결과 <strong class="font-mono text-[#20251f]">{{ filteredBays.length }}</strong
            >건
          </p>
        </div>

        <div
          v-if="loading"
          class="flex min-h-72 items-center justify-center text-sm text-[#777f76]"
        >
          <Loader2 class="mr-2 size-5 animate-spin text-[#6f845e]" /> Bay 정보를 불러오는 중입니다.
        </div>

        <div
          v-else-if="errorMessage"
          class="flex min-h-72 flex-col items-center justify-center px-6 text-center"
        >
          <TriangleAlert class="size-8 text-red-600" />
          <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
          <button
            type="button"
            class="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            @click="loadBays()"
          >
            <RefreshCw class="size-3.5" /> 다시 시도
          </button>
        </div>

        <div
          v-else-if="filteredBays.length === 0"
          class="flex min-h-72 flex-col items-center justify-center text-center"
        >
          <span
            class="flex size-12 items-center justify-center rounded-xl bg-[#f1f3ef] text-[#7e877b]"
          >
            <Search class="size-5" />
          </span>
          <p class="mt-4 text-sm font-semibold">조건에 맞는 Bay가 없습니다.</p>
          <p class="mt-1 text-xs text-[#8a9188]">
            검색 조건을 변경하거나 새로운 Bay를 생성해 주세요.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[64rem] border-collapse text-left">
            <thead class="bg-[#f7f8f5]">
              <tr class="border-b border-[#e0e4dd]">
                <th class="w-[19%] px-5 py-3.5 text-[11px] font-semibold text-[#697067]">
                  Bay 정보
                </th>
                <th class="w-[11%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">
                  운영 상태
                </th>
                <th class="w-[25%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">
                  작업 진행률
                </th>
                <th class="w-[16%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">
                  작업 현황
                </th>
                <th class="w-[9%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">
                  이슈 / 인원
                </th>
                <th class="w-[13%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">
                  최근 활동
                </th>
                <th class="w-[7%] px-5 py-3.5 text-right text-[11px] font-semibold text-[#697067]">
                  상세
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eceee9]">
              <tr
                v-for="bay in filteredBays"
                :key="bay.id"
                class="group transition hover:bg-[#fbfcf9]"
              >
                <td class="px-5 py-4 align-middle">
                  <p class="font-mono text-[13px] font-bold tracking-[-0.01em] text-[#1d241c]">
                    {{ bay.code }}
                  </p>
                  <p class="mt-1 max-w-[17rem] truncate text-xs text-[#858c83]">
                    {{ bay.description || '등록된 설명이 없습니다.' }}
                  </p>
                </td>
                <td class="px-4 py-4 align-middle">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                    :class="getBayStateClass(bay)"
                  >
                    <span class="size-1.5 rounded-full bg-current opacity-75" />
                    {{ getBayStateLabel(bay) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-middle">
                  <div class="flex items-center justify-between gap-3">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9ece6]">
                      <div
                        class="h-full rounded-full bg-[#7da554] transition-all duration-500"
                        :style="{ width: `${bay.completionRate}%` }"
                      />
                    </div>
                    <span
                      class="w-10 text-right font-mono text-[11px] font-semibold text-[#495147]"
                    >
                      {{ bay.completionRate }}%
                    </span>
                  </div>
                  <p class="mt-1.5 text-[10px] text-[#949b92]">
                    완료 {{ bay.completed }} / 전체 {{ bay.total }}
                  </p>
                </td>
                <td class="px-4 py-4 align-middle">
                  <div class="flex items-center gap-3 text-[11px]">
                    <span class="text-[#777e75]"
                      >대기 <strong class="ml-1 text-[#30362f]">{{ bay.notStarted }}</strong></span
                    >
                    <span class="text-amber-700"
                      >진행 <strong class="ml-1">{{ bay.inProgress }}</strong></span
                    >
                    <span class="text-emerald-700"
                      >완료 <strong class="ml-1">{{ bay.completed }}</strong></span
                    >
                  </div>
                </td>
                <td class="px-4 py-4 align-middle">
                  <p class="text-[11px] text-[#737a71]">
                    이슈
                    <strong :class="bay.openIssues ? 'text-red-700' : 'text-[#30362f]'">{{
                      bay.openIssues
                    }}</strong>
                    <span class="mx-1 text-[#c0c5bd]">/</span>
                    인원 <strong class="text-[#30362f]">{{ bay.activeWorkers }}</strong>
                  </p>
                </td>
                <td class="px-4 py-4 align-middle">
                  <p class="font-mono text-[10px] text-[#697067]">
                    {{ formatActivity(bay.lastActivityAt) }}
                  </p>
                </td>
                <td class="px-5 py-4 text-right align-middle">
                  <NuxtLink
                    :to="{ path: '/bay', query: { targetBay: bay.code } }"
                    :aria-label="`${bay.code} 상세 운영 보기`"
                    class="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-[#7a8278] transition group-hover:border-[#d8ddd4] group-hover:bg-white group-hover:text-[#263022]"
                  >
                    <ArrowUpRight class="size-4" />
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </div>
</template>
