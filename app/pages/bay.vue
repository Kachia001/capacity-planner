<script setup lang="ts">
import { Loader2, ShieldAlert } from '@lucide/vue'
import ManagementOverview from '@/components/operations/ManagementOverview.vue'
import WorkerOperationsHeader from '@/components/operations/WorkerOperationsHeader.vue'
import WorkItemExplorer from '@/components/operations/WorkItemExplorer.vue'
import {
  cancelWorkItemStart,
  completeWorkItem,
  fetchBayOptions,
  fetchBayWorkItems,
  fetchOperationsDashboard,
  getRequestErrorMessage,
  startWorkItem,
  voidWorkItem,
} from '@/composables/useOperationsApi'
import type {
  BayOption,
  OperationWorkItem,
  OperationsDashboardResponse,
  WorkItemSearchFilters,
  WorkItemStatus,
} from '@/types/operations'

definePageMeta({ middleware: 'auth-client' })
useHead({ title: 'BAY 작업 운영 · Capacity Planner' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()

const booting = ref(true)
const bootError = ref<string | null>(null)
const bays = ref<BayOption[]>([])
const dashboard = ref<OperationsDashboardResponse | null>(null)
const dashboardPending = ref(false)
const dashboardError = ref<string | null>(null)
const selectedBayId = ref<string | null>(null)
const focusedWorkItemId = ref<number | null>(null)
const items = ref<OperationWorkItem[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const listPending = ref(false)
const loadingMore = ref(false)
const listError = ref<string | null>(null)
const mutationItemId = ref<number | null>(null)
const noticeMessage = ref<string | null>(null)
const noticeTone = ref<'success' | 'error'>('success')
const filters = reactive<WorkItemSearchFilters>({
  q: '',
  status: 'all',
  highAltitude: null,
  hasIssue: null,
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let refreshTimer: ReturnType<typeof setInterval> | undefined
let requestSequence = 0

const isSupervisor = computed(
  () => auth.profile?.role === 'admin' || auth.profile?.role === 'manager',
)
const showsManagementOverview = computed(() => auth.profile?.role === 'manager')
const usesWorkerDetail = computed(
  () => auth.profile?.role === 'worker' || auth.profile?.role === 'admin',
)
const usesMobileOperations = computed(
  () => auth.profile?.role === 'manager' || auth.profile?.role === 'worker',
)
const actorLabel = computed(() => auth.profile?.displayName || auth.profile?.email || '사용자')
const routeTargetBay = computed(() => {
  const target = route.query.targetBay
  return typeof target === 'string' && target.trim() ? target.trim() : null
})
const routeTargetWorkItem = computed(() => {
  const target = route.query.targetWorkItem

  if (typeof target !== 'string' || !/^\d+$/.test(target)) {
    return null
  }

  const workItemId = Number.parseInt(target, 10)
  return Number.isSafeInteger(workItemId) && workItemId > 0 ? workItemId : null
})
const selectedBay = computed(
  () => bays.value.find(candidate => candidate.id === selectedBayId.value) ?? null,
)

async function requireAccessToken() {
  const accessToken = await auth.getAccessToken()

  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  return accessToken
}

function sortBays(options: BayOption[]) {
  return [...options].sort((first, second) =>
    first.code.localeCompare(second.code, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

async function loadBays() {
  const accessToken = await requireAccessToken()
  bays.value = sortBays(await fetchBayOptions(accessToken))
}

async function loadDashboard() {
  if (!showsManagementOverview.value) {
    return
  }

  dashboardPending.value = true
  dashboardError.value = null

  try {
    const accessToken = await requireAccessToken()
    dashboard.value = await fetchOperationsDashboard(accessToken)
  } catch (error) {
    dashboardError.value = getRequestErrorMessage(
      error,
      '전체 Bay 운영 현황을 불러오지 못했습니다.',
    )
  } finally {
    dashboardPending.value = false
  }
}

async function loadWorkItems(append = false) {
  const bayId = selectedBayId.value

  if (!bayId) {
    items.value = []
    total.value = 0
    nextCursor.value = null
    return
  }

  const sequence = ++requestSequence

  if (append) {
    loadingMore.value = true
  } else {
    listPending.value = true
    listError.value = null
  }

  try {
    const accessToken = await requireAccessToken()
    const response = await fetchBayWorkItems(
      accessToken,
      bayId,
      filters,
      append ? nextCursor.value : null,
      focusedWorkItemId.value,
    )

    if (sequence !== requestSequence) {
      return
    }

    items.value = append ? [...items.value, ...response.items] : response.items
    total.value = response.total
    nextCursor.value = response.nextCursor
  } catch (error) {
    if (sequence === requestSequence) {
      listError.value = getRequestErrorMessage(error, '작업 목록을 불러오지 못했습니다.')
      if (!append) {
        items.value = []
        total.value = 0
        nextCursor.value = null
      }
    }
  } finally {
    if (sequence === requestSequence) {
      listPending.value = false
      loadingMore.value = false
    }
  }
}

function showNotice(message: string, tone: 'success' | 'error') {
  noticeMessage.value = message
  noticeTone.value = tone
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeMessage.value = null
  }, 6000)
}

async function revealWorkItem(workItemId: number) {
  await nextTick()
  const workItem = document.getElementById(`work-item-${workItemId}`)

  if (!workItem) {
    return
  }

  workItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
  workItem.focus({ preventScroll: true })
}

function releaseFocusedWorkItem() {
  if (focusedWorkItemId.value === null) {
    return
  }

  focusedWorkItemId.value = null
  const bay = selectedBay.value
  void router.replace({
    path: '/bay',
    query: bay ? { targetBay: bay.code } : undefined,
  })
}

async function chooseBay(bayId: string, updateRoute = true, workItemId: number | null = null) {
  if (!bayId) {
    return
  }

  selectedBayId.value = bayId
  focusedWorkItemId.value = workItemId
  items.value = []
  total.value = 0
  nextCursor.value = null
  noticeMessage.value = null

  if (updateRoute) {
    const bay = bays.value.find(candidate => candidate.id === bayId)
    await router.replace({
      path: '/bay',
      query: bay
        ? {
            targetBay: bay.code,
            ...(workItemId ? { targetWorkItem: String(workItemId) } : {}),
          }
        : undefined,
    })
  }

  await loadWorkItems()
  await nextTick()

  if (workItemId) {
    await revealWorkItem(workItemId)
  } else if (isSupervisor.value) {
    document.getElementById('work-item-explorer')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

async function focusDashboardWorkItem(bayId: string, workItemId: number) {
  if (searchTimer) clearTimeout(searchTimer)
  filters.q = ''
  filters.status = 'all'
  filters.highAltitude = null
  filters.hasIssue = null
  await chooseBay(bayId, true, workItemId)
}

async function clearFocusedWorkItem() {
  const bayId = selectedBayId.value

  if (!bayId) {
    return
  }

  focusedWorkItemId.value = null
  const bay = selectedBay.value
  await router.replace({
    path: '/bay',
    query: bay ? { targetBay: bay.code } : undefined,
  })
  await loadWorkItems()
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadWorkItems()
  }, 300)
}

function updateSearch(value: string) {
  releaseFocusedWorkItem()
  filters.q = value
  scheduleSearch()
}

function updateStatus(value: WorkItemStatus | 'all') {
  releaseFocusedWorkItem()
  filters.status = value
  void loadWorkItems()
}

function updateHighAltitude(value: boolean | null) {
  releaseFocusedWorkItem()
  filters.highAltitude = value
  void loadWorkItems()
}

function updateHasIssue(value: boolean | null) {
  releaseFocusedWorkItem()
  filters.hasIssue = value
  void loadWorkItems()
}

function loadMoreWorkItems() {
  void loadWorkItems(true)
}

function retryWorkItems() {
  void loadWorkItems()
}

function workItemDetails(item: OperationWorkItem) {
  return [
    { label: 'Bay', value: selectedBay.value?.code ?? '미확인' },
    { label: '작업명', value: item.workName || '작업명 없음' },
    { label: '상세 작업', value: item.workDetail || '상세 내용 없음' },
    { label: '품번', value: item.partNo || '미입력' },
    {
      label: '위험 구분',
      value: item.isHighAltitude ? '고소작업' : '일반작업',
      tone: item.isHighAltitude ? ('warning' as const) : ('default' as const),
    },
  ]
}

function workDetailLabel(item: OperationWorkItem) {
  return item.workDetail?.trim() || `세부 작업 #${item.id}`
}

async function refreshAfterMutation() {
  await Promise.all([
    loadWorkItems(),
    showsManagementOverview.value ? loadDashboard() : Promise.resolve(),
  ])
}

async function requestStart(item: OperationWorkItem) {
  const accepted = await globalAlert.confirm({
    variant: 'warning',
    title: '선택한 세부 작업을 시작할까요?',
    message:
      '선택한 workDetail 1건만 작업 중으로 변경됩니다. 같은 workName에 포함된 다른 세부 작업의 상태는 변경되지 않습니다. 작업자는 시작 후 직접 취소할 수 없으므로 대상을 다시 확인해 주세요.',
    confirmLabel: '세부 작업 시작',
    cancelLabel: '돌아가기',
    details: workItemDetails(item),
    acknowledgementLabel: item.isHighAltitude
      ? '이 작업이 고소작업임을 확인했으며 현장 안전수칙과 안전 참고사항을 확인했습니다.'
      : undefined,
  })

  if (!accepted) return

  mutationItemId.value = item.id
  try {
    const accessToken = await requireAccessToken()
    await startWorkItem(accessToken, item.id)
    showNotice(`“${workDetailLabel(item)}” 세부 작업 1건을 시작했습니다.`, 'success')
    await refreshAfterMutation()
    await revealWorkItem(item.id)
  } catch (error) {
    showNotice(getRequestErrorMessage(error, '작업을 시작하지 못했습니다.'), 'error')
    await loadWorkItems()
  } finally {
    mutationItemId.value = null
  }
}

async function requestComplete(item: OperationWorkItem) {
  const accepted = await globalAlert.confirm({
    variant: 'success',
    title: '선택한 세부 작업을 완료할까요?',
    message:
      '선택한 workDetail 1건만 완료로 변경됩니다. 같은 workName의 다른 세부 작업은 현재 상태를 유지합니다. 실제 작업 결과와 대상 항목을 다시 확인해 주세요.',
    confirmLabel: '세부 작업 완료',
    cancelLabel: '계속 작업',
    details: workItemDetails(item),
  })

  if (!accepted) return

  mutationItemId.value = item.id
  try {
    const accessToken = await requireAccessToken()
    await completeWorkItem(accessToken, item.id)
    showNotice(`“${workDetailLabel(item)}” 세부 작업 1건을 완료했습니다.`, 'success')
    await refreshAfterMutation()
    await revealWorkItem(item.id)
  } catch (error) {
    showNotice(getRequestErrorMessage(error, '작업을 완료하지 못했습니다.'), 'error')
    await loadWorkItems()
  } finally {
    mutationItemId.value = null
  }
}

async function requestCancelStart(item: OperationWorkItem) {
  const reason = await globalAlert.prompt({
    variant: 'warning',
    title: '선택한 세부 작업의 시작을 취소합니다',
    message:
      '선택한 workDetail 1건만 미작업으로 돌아가며 기존 시작과 관리자 취소 기록은 감사 이력에 남습니다.',
    confirmLabel: '세부 시작 취소',
    cancelLabel: '돌아가기',
    details: workItemDetails(item),
    prompt: {
      label: '취소 사유',
      placeholder: '예: 작업 항목을 잘못 선택함',
      minLength: 3,
      maxLength: 500,
    },
  })

  if (!reason) return

  mutationItemId.value = item.id
  try {
    const accessToken = await requireAccessToken()
    await cancelWorkItemStart(accessToken, item.id, reason)
    showNotice('작업 시작을 취소하고 미작업 상태로 복구했습니다.', 'success')
    await refreshAfterMutation()
  } catch (error) {
    showNotice(getRequestErrorMessage(error, '작업 시작을 취소하지 못했습니다.'), 'error')
    await loadWorkItems()
  } finally {
    mutationItemId.value = null
  }
}

async function requestVoid(item: OperationWorkItem) {
  const reason = await globalAlert.prompt({
    variant: 'destructive',
    title: '작업 항목을 무효화합니다',
    message:
      '작업은 목록과 집계에서 제외되지만 물리적으로 삭제되지 않으며 처리자와 사유가 감사 이력에 남습니다.',
    confirmLabel: '작업 무효화',
    cancelLabel: '돌아가기',
    details: workItemDetails(item),
    prompt: {
      label: '무효화 사유',
      placeholder: '무효화가 필요한 이유를 입력하세요.',
      minLength: 3,
      maxLength: 500,
    },
  })

  if (!reason) return

  mutationItemId.value = item.id
  try {
    const accessToken = await requireAccessToken()
    await voidWorkItem(accessToken, item.id, reason)
    showNotice('작업 항목을 감사 가능한 상태로 무효화했습니다.', 'success')
    await refreshAfterMutation()
  } catch (error) {
    showNotice(getRequestErrorMessage(error, '작업을 무효화하지 못했습니다.'), 'error')
    await loadWorkItems()
  } finally {
    mutationItemId.value = null
  }
}

async function refreshAll() {
  await Promise.all([loadDashboard(), selectedBayId.value ? loadWorkItems() : Promise.resolve()])
}

function findRouteBay(target: string | null) {
  if (!target) return null
  const normalized = target.toLocaleLowerCase()
  return (
    bays.value.find(bay => bay.id === target || bay.code.toLocaleLowerCase() === normalized) ?? null
  )
}

onMounted(async () => {
  try {
    await auth.initialize()

    if (!auth.profile) {
      throw new Error('등록된 역할 정보를 확인할 수 없습니다.')
    }

    filters.status = usesMobileOperations.value ? 'all' : 'not_started'
    await Promise.all([
      loadBays(),
      showsManagementOverview.value ? loadDashboard() : Promise.resolve(),
    ])

    const routeBay = findRouteBay(routeTargetBay.value)
    if (routeBay) {
      if (routeTargetWorkItem.value) {
        filters.q = ''
        filters.status = 'all'
        filters.highAltitude = null
        filters.hasIssue = null
      }
      await chooseBay(routeBay.id, false, routeTargetWorkItem.value)
    }

    refreshTimer = setInterval(() => {
      if (mutationItemId.value === null && !listPending.value) {
        if (showsManagementOverview.value) {
          void loadDashboard()
        } else if (selectedBayId.value) {
          void loadWorkItems()
        }
      }
    }, 30000)
  } catch (error) {
    bootError.value = getRequestErrorMessage(error, '운영 화면을 준비하지 못했습니다.')
  } finally {
    booting.value = false
  }
})

watch([routeTargetBay, routeTargetWorkItem], async ([targetBay, targetWorkItem]) => {
  if (booting.value) return

  const bay = findRouteBay(targetBay)
  if (targetWorkItem) {
    filters.q = ''
    filters.status = 'all'
    filters.highAltitude = null
    filters.hasIssue = null
  }
  if (bay && (bay.id !== selectedBayId.value || targetWorkItem !== focusedWorkItemId.value)) {
    await chooseBay(bay.id, false, targetWorkItem)
  }
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div
    v-if="booting"
    class="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-[#edf2ee] text-sm text-zinc-600"
  >
    <Loader2 class="mr-2 size-5 animate-spin text-emerald-600" /> 운영 정책과 작업 현황을 불러오는
    중입니다.
  </div>

  <section
    v-else-if="bootError || !auth.profile"
    class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl flex-col items-center justify-center px-6 text-center"
  >
    <ShieldAlert class="size-10 text-red-600" />
    <h1 class="mt-5 text-xl font-semibold">운영 화면에 접근할 수 없습니다.</h1>
    <p class="mt-2 text-sm leading-6 text-red-700">
      {{ bootError || '역할 정보를 확인할 수 없습니다.' }}
    </p>
  </section>

  <template v-else>
    <WorkerOperationsHeader
      v-if="usesWorkerDetail"
      :display-name="actorLabel"
      :bay-count="bays.length"
      :is-admin="auth.profile.role === 'admin'"
    />

    <ManagementOverview
      v-else-if="showsManagementOverview"
      :dashboard="dashboard"
      :pending="dashboardPending"
      :error-message="dashboardError"
      :actor-label="actorLabel"
      @select-work-item="focusDashboardWorkItem"
      @refresh="refreshAll"
    />

    <div id="work-item-explorer" class="scroll-mt-4 bg-[#f5f8f5]">
      <WorkItemExplorer
        :role="auth.profile.role"
        :current-user-id="auth.profile.id"
        :bays="bays"
        :selected-bay-id="selectedBayId"
        :items="items"
        :filters="filters"
        :total="total"
        :next-cursor="nextCursor"
        :pending="listPending"
        :loading-more="loadingMore"
        :mutation-item-id="mutationItemId"
        :focused-work-item-id="focusedWorkItemId"
        :error-message="listError"
        :notice-message="noticeMessage"
        :notice-tone="noticeTone"
        :title="usesMobileOperations ? '작업 그룹 선택' : '상세 작업 찾기'"
        :description="
          usesMobileOperations
            ? '큰 작업명을 터치하면 세부 작업이 아래로 펼쳐집니다. 필요한 항목에서 작업을 처리하세요.'
            : '작업명과 품번을 검색하고 현재 가능한 다음 행동만 처리하세요.'
        "
        @select-bay="chooseBay"
        @update-search="updateSearch"
        @update-status="updateStatus"
        @update-high-altitude="updateHighAltitude"
        @update-has-issue="updateHasIssue"
        @start="requestStart"
        @complete="requestComplete"
        @cancel-start="requestCancelStart"
        @void="requestVoid"
        @clear-focus="clearFocusedWorkItem"
        @load-more="loadMoreWorkItems"
        @retry="retryWorkItems"
      />
    </div>
  </template>
</template>
