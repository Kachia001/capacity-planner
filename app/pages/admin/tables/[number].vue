<script setup lang="ts">
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  Link2,
  RefreshCw,
  TriangleAlert,
  Unlink,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import WorkItemIssueList from '@/components/operations/WorkItemIssueList.vue'
import {
  assignBayToTable,
  fetchBayOptions,
  fetchBayWorkItems,
  fetchWorkTable,
  getRequestErrorMessage,
} from '@/composables/useOperationsApi'
import type { BayOption, OperationWorkItem } from '@/types/operations'
import type { WorkTableOverview } from '#shared/api/tables/table.contract'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager', 'worker'],
})

const route = useRoute()
const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()
const tableNumber = computed(() => Number.parseInt(String(route.params.number), 10))
const table = ref<WorkTableOverview | null>(null)
const bays = ref<BayOption[]>([])
const workItems = ref<OperationWorkItem[]>([])
const selectedBayId = ref('')
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const expandedIssueRows = ref<Set<number>>(new Set())
const canManageAssignments = computed(() => auth.isSupervisor)

const availableBays = computed(() =>
  bays.value.filter(bay => bay.tableNumber === null || bay.id === table.value?.bay?.id),
)

useHead(() => ({
  title: `테이블 ${String(tableNumber.value).padStart(3, '0')} · Capacity Planner`,
}))

async function loadTable() {
  loading.value = true
  errorMessage.value = null
  try {
    await auth.initialize()
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    const [nextTable, nextBays] = await Promise.all([
      fetchWorkTable(tableNumber.value),
      canManageAssignments.value ? fetchBayOptions() : Promise.resolve([]),
    ])
    table.value = nextTable
    bays.value = nextBays
    selectedBayId.value = nextTable.bay?.id ?? ''

    if (nextTable.bay) {
      const response = await fetchBayWorkItems(
        nextTable.bay.id,
        { q: '', status: 'all', highAltitude: null, hasIssue: null },
        null,
        null,
        100,
      )
      workItems.value = response.items
    } else {
      workItems.value = []
    }
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '테이블 상세 정보를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function saveAssignment() {
  if (!canManageAssignments.value || !selectedBayId.value) return
  saving.value = true
  errorMessage.value = null
  try {
    await assignBayToTable(tableNumber.value, selectedBayId.value)
    await loadTable()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'BAY를 할당하지 못했습니다.')
  } finally {
    saving.value = false
  }
}

async function removeAssignment() {
  if (!canManageAssignments.value || !table.value?.bay) return
  const accepted = await globalAlert.confirm({
    variant: 'warning',
    title: 'BAY 배치 해제',
    message: `${table.value.bay.code}를 ${String(tableNumber.value).padStart(3, '0')}번 테이블에서 해제하시겠습니까?`,
    confirmLabel: '배치 해제',
  })
  if (!accepted) return

  saving.value = true
  try {
    await assignBayToTable(tableNumber.value, null)
    await loadTable()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'BAY 배치를 해제하지 못했습니다.')
  } finally {
    saving.value = false
  }
}

function statusLabel(status: OperationWorkItem['status']) {
  return { not_started: '대기', in_progress: '작업 중', completed: '완료' }[status]
}

function openIssueWorkItem(item: OperationWorkItem) {
  if (!table.value?.bay) return
  void navigateTo({
    path: '/bay',
    query: { targetBay: table.value.bay.code, targetWorkItem: String(item.id) },
  })
}

function toggleIssueRow(item: OperationWorkItem) {
  if (item.issues.length === 0) return

  const next = new Set(expandedIssueRows.value)
  if (next.has(item.id)) next.delete(item.id)
  else next.add(item.id)
  expandedIssueRows.value = next
}

onMounted(loadTable)
</script>

<template>
  <main class="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10">
    <NuxtLink
      to="/admin/tables"
      class="inline-flex items-center gap-2 text-xs font-semibold text-[#697067] hover:text-[#171a17]"
    >
      <ArrowLeft class="size-3.5" /> 테이블 배치로 돌아가기
    </NuxtLink>

    <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
          Table detail
        </p>
        <h1 class="mt-2 font-mono text-3xl font-semibold tracking-[-0.04em]">
          TABLE {{ String(tableNumber).padStart(3, '0') }}
        </h1>
        <p class="mt-2 text-sm text-[#727970]">할당된 BAY의 진행 현황과 작업 이슈를 확인합니다.</p>
      </div>
      <Button
        type="button"
        variant="outline"
        tone="neutral"
        size="md"
        :loading="loading"
        @click="loadTable"
      >
        <RefreshCw class="size-3.5" /> 최신 정보
      </Button>
    </div>

    <div
      v-if="errorMessage"
      class="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
    >
      <TriangleAlert class="size-5 shrink-0" /> {{ errorMessage }}
    </div>

    <div v-if="loading && !table" class="mt-6 h-80 animate-pulse rounded-xl bg-zinc-100" />

    <template v-else-if="table">
      <section
        class="mt-6 grid gap-6"
        :class="canManageAssignments ? 'xl:grid-cols-[minmax(0,1.4fr)_22rem]' : ''"
      >
        <div
          class="overflow-hidden rounded-xl border border-[#343d43] bg-[#1d252b] text-white shadow-[0_18px_45px_rgba(15,22,26,0.16)]"
        >
          <div class="border-b border-white/10 px-6 py-5">
            <p class="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9ca8ae]">
              Assigned bay
            </p>
            <div v-if="table.bay" class="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 class="text-2xl font-semibold">{{ table.bay.code }}</h2>
                <p class="mt-1 text-xs text-[#aab5bb]">
                  {{ table.bay.description || '등록된 설명이 없습니다.' }}
                </p>
              </div>
              <Button
                as-child
                variant="outline"
                tone="neutral"
                size="sm"
                class="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <NuxtLink :to="{ path: '/bay', query: { targetBay: table.bay.code } }"
                  >BAY 상세 <ArrowUpRight class="size-3.5"
                /></NuxtLink>
              </Button>
            </div>
            <div
              v-else
              class="mt-3 flex min-h-28 items-center justify-center border border-dashed border-white/20 text-sm text-[#8f9aa0]"
            >
              할당된 BAY가 없습니다.
            </div>
          </div>

          <div v-if="table.bay" class="grid grid-cols-2 sm:grid-cols-4">
            <div class="border-b border-r border-white/10 p-5 sm:border-b-0">
              <p class="text-[10px] text-[#9ca8ae]">진행률</p>
              <p class="mt-2 font-mono text-2xl font-semibold text-[#c5f277]">
                {{ table.bay.completionRate }}%
              </p>
            </div>
            <div class="border-b border-white/10 p-5 sm:border-b-0 sm:border-r">
              <p class="text-[10px] text-[#9ca8ae]">전체 작업</p>
              <p class="mt-2 font-mono text-2xl font-semibold">{{ table.bay.total }}</p>
            </div>
            <div class="border-r border-white/10 p-5">
              <p class="text-[10px] text-[#9ca8ae]">작업 중</p>
              <p class="mt-2 font-mono text-2xl font-semibold text-amber-300">
                {{ table.bay.inProgress }}
              </p>
            </div>
            <div class="p-5">
              <p class="text-[10px] text-[#9ca8ae]">미해결 이슈</p>
              <p
                class="mt-2 font-mono text-2xl font-semibold"
                :class="table.bay.openIssues ? 'text-red-300' : ''"
              >
                {{ table.bay.openIssues }}
              </p>
            </div>
          </div>
        </div>

        <aside
          v-if="canManageAssignments"
          class="h-fit rounded-xl border border-[#d9ddd5] bg-white p-5"
        >
          <p class="font-mono text-[9px] uppercase tracking-[0.18em] text-[#92998f]">
            Bay assignment
          </p>
          <h2 class="mt-2 text-sm font-semibold">BAY 할당 변경</h2>
          <select
            v-model="selectedBayId"
            class="mt-4 h-11 w-full rounded-lg border border-[#d6dad2] bg-white px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
          >
            <option value="" disabled>미배치 BAY 선택</option>
            <option v-for="bay in availableBays" :key="bay.id" :value="bay.id">
              {{ bay.code
              }}{{ bay.tableNumber ? ` · TABLE ${String(bay.tableNumber).padStart(3, '0')}` : '' }}
            </option>
          </select>
          <Button
            class="mt-3 w-full"
            :disabled="!selectedBayId"
            :loading="saving"
            @click="saveAssignment"
            ><Link2 class="size-4" /> 이 테이블에 할당</Button
          >
          <Button
            v-if="table.bay"
            variant="outline"
            tone="danger"
            class="mt-2 w-full"
            :disabled="saving"
            @click="removeAssignment"
            ><Unlink class="size-4" /> 배치 해제</Button
          >
          <p class="mt-3 text-[10px] leading-4 text-[#8a9188]">
            다른 테이블의 BAY를 선택하면 현재 BAY는 미배치 상태로 이동합니다.
          </p>
        </aside>
      </section>

      <section class="mt-6 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white">
        <div class="border-b border-[#e4e7e1] px-5 py-4">
          <h2 class="text-sm font-semibold">작업 상세</h2>
          <p class="mt-1 text-xs text-[#858c83]">최대 100개의 작업을 순서대로 표시합니다.</p>
        </div>
        <div
          v-if="!table.bay"
          class="flex min-h-40 items-center justify-center text-sm text-[#8a9188]"
        >
          BAY를 할당하면 작업 상세가 표시됩니다.
        </div>
        <div
          v-else-if="workItems.length === 0"
          class="flex min-h-40 items-center justify-center text-sm text-[#8a9188]"
        >
          등록된 작업이 없습니다.
        </div>
        <div v-else class="divide-y divide-[#eceee9]">
          <article v-for="item in workItems" :key="item.id">
            <div class="grid sm:grid-cols-[minmax(0,1fr)_8rem]">
              <button
                type="button"
                class="grid w-full gap-3 px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#71865e] sm:grid-cols-[5rem_minmax(0,1fr)_7rem_8rem_1.5rem] sm:items-center"
                :class="item.issues.length ? 'cursor-pointer hover:bg-[#f8faf5]' : 'cursor-default'"
                :aria-expanded="item.issues.length ? expandedIssueRows.has(item.id) : undefined"
                :aria-controls="
                  item.issues.length ? `table-work-item-issues-${item.id}` : undefined
                "
                :disabled="item.issues.length === 0"
                @click="toggleIssueRow(item)"
              >
                <span class="font-mono text-xs text-[#7a8278]">#{{ item.sortOrder }}</span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold">{{
                    item.workName || item.workDetail || '작업명 없음'
                  }}</span>
                  <span class="mt-1 block truncate text-xs text-[#8a9188]">{{
                    item.workDetail || item.itemName || '상세 정보 없음'
                  }}</span>
                </span>
                <span
                  class="text-xs font-semibold"
                  :class="
                    item.status === 'completed'
                      ? 'text-emerald-700'
                      : item.status === 'in_progress'
                        ? 'text-amber-700'
                        : 'text-[#737a71]'
                  "
                  >{{ statusLabel(item.status) }}</span
                >
                <span
                  class="text-xs"
                  :class="item.openIssueCount ? 'font-semibold text-red-700' : 'text-[#8a9188]'"
                >
                  이슈 {{ item.openIssueCount }}
                  <span
                    v-if="item.issues.length !== item.openIssueCount"
                    class="font-normal text-[#9aa198]"
                    >/ 전체 {{ item.issues.length }}</span
                  >
                </span>
                <ChevronDown
                  v-if="item.issues.length"
                  class="size-4 text-[#7a8278] transition-transform"
                  :class="expandedIssueRows.has(item.id) ? 'rotate-180' : ''"
                />
                <span v-else aria-hidden="true" />
              </button>

              <NuxtLink
                :to="{
                  path: '/bay',
                  query: { targetBay: table.bay.code },
                }"
                class="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 border-t border-[#eceee9] px-4 text-xs font-semibold text-[#526348] transition hover:bg-[#eef8dc] hover:text-[#26331f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#71865e] sm:border-l sm:border-t-0"
                :aria-label="`${table.bay.code} 작업 화면으로 이동`"
              >
                작업 화면 <ArrowUpRight class="size-3.5" />
              </NuxtLink>
            </div>

            <div
              v-if="item.issues.length && expandedIssueRows.has(item.id)"
              :id="`table-work-item-issues-${item.id}`"
              class="border-t border-[#eceee9] bg-[#f7f9f4] px-5 pb-5 pt-2 sm:pl-24"
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-xs font-semibold text-[#555d53]">
                  등록된 이슈 {{ item.issues.length }}건
                </p>
                <p class="text-[10px] text-[#8a9188]">미해결 {{ item.openIssueCount }}건</p>
              </div>
              <WorkItemIssueList
                :issues="item.issues"
                :can-manage="false"
                :pending="false"
                selectable
                @select="openIssueWorkItem(item)"
              />
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>
