<script setup lang="ts">
import { ArrowUpRight, RefreshCw, TriangleAlert } from '@lucide/vue'
import BayStatusMatrix from '@/components/operations/BayStatusMatrix.vue'
import OperationControlPanel from '@/components/operations/OperationControlPanel.vue'
import { Button } from '@/components/ui/button'
import {
  closeOperation,
  fetchOperationStatus,
  fetchOperationsDashboard,
  getRequestErrorMessage,
  openOperation,
} from '@/composables/useOperationsApi'
import type {
  OperationOpenRequest,
  OperationStatus,
  OperationsDashboardResponse,
} from '@/types/operations'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '운영 현황 · Capacity Planner Admin' })

const auth = useAuthStore()
const dashboard = ref<OperationsDashboardResponse | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref<string | null>(null)
const operationStatus = ref<OperationStatus | null>(null)
const operationPending = ref(false)
const operationMutationPending = ref(false)
const operationError = ref<string | null>(null)

async function openBayDetail(bayId: string) {
  const bay = dashboard.value?.bays.find(candidate => candidate.id === bayId)
  if (!bay) return

  await navigateTo({ path: '/bay', query: { targetBay: bay.code } })
}

async function loadOverview(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = null

  try {
    await auth.initialize()
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    const [nextDashboard, nextOperationStatus] = await Promise.all([
      fetchOperationsDashboard(),
      fetchOperationStatus(),
    ])
    dashboard.value = nextDashboard
    operationStatus.value = nextOperationStatus
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Bay 운영 현황을 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadOperationControl() {
  operationPending.value = true
  operationError.value = null

  try {
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    operationStatus.value = await fetchOperationStatus()
  } catch (error) {
    operationError.value = getRequestErrorMessage(error, '운영 상태를 불러오지 못했습니다.')
  } finally {
    operationPending.value = false
  }
}

async function requestOperationOpen(request?: OperationOpenRequest) {
  operationMutationPending.value = true
  operationError.value = null

  try {
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    operationStatus.value = await openOperation(request)
  } catch (error) {
    operationError.value = getRequestErrorMessage(error, '운영을 Open하지 못했습니다.')
  } finally {
    operationMutationPending.value = false
  }
}

async function requestOperationClose() {
  operationMutationPending.value = true
  operationError.value = null

  try {
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    operationStatus.value = await closeOperation()
  } catch (error) {
    operationError.value = getRequestErrorMessage(error, '운영을 Close하지 못했습니다.')
  } finally {
    operationMutationPending.value = false
  }
}

function handleOperationExpired() {
  if (operationStatus.value) {
    operationStatus.value = {
      ...operationStatus.value,
      isOpen: false,
      mode: 'closed',
      closesAt: null,
    }
  }
  void loadOperationControl()
}

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div
        class="flex flex-col items-stretch justify-between gap-6 lg:flex-row lg:items-end lg:gap-8"
      >
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Operations overview
          </p>
          <h2 class="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#171a17] sm:text-[2rem]">
            전체 Bay 운영 상태를 한눈에 확인합니다.
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            상태 분포에서 진행률과 이슈를 확인하고 필요한 Bay의 작업 상세로 바로 이동할 수 있습니다.
          </p>
        </div>

        <div class="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <Button
            as-child
            variant="outline"
            tone="neutral"
            size="md"
            class="border-[#cdd2c9] bg-white text-xs text-[#414840] hover:border-[#949d91] hover:bg-[#fafbf8]"
          >
            <NuxtLink to="/admin/bays"> Bay 목록 열기 <ArrowUpRight class="size-3.5" /> </NuxtLink>
          </Button>
          <Button
            type="button"
            variant="solid"
            tone="neutral"
            size="md"
            :loading="loading || refreshing"
            loading-text="동기화 중"
            class="text-xs shadow-[0_8px_20px_rgba(23,27,24,0.14)]"
            @click="loadOverview(true)"
          >
            <RefreshCw class="size-3.5" />
            최신 정보
          </Button>
        </div>
      </div>

      <OperationControlPanel
        class="mt-6"
        :status="operationStatus"
        :can-manage="true"
        :pending="loading || operationPending"
        :mutation-pending="operationMutationPending"
        :error-message="operationError"
        @open="requestOperationOpen"
        @close="requestOperationClose"
        @refresh="loadOperationControl"
        @expired="handleOperationExpired"
      />

      <div
        v-if="errorMessage"
        class="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-center"
      >
        <TriangleAlert class="size-8 text-red-600" />
        <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
        <Button
          type="button"
          variant="outline"
          tone="danger"
          size="sm"
          class="mt-4 border-red-200 bg-white text-xs text-red-700 hover:bg-red-100"
          @click="loadOverview()"
        >
          <RefreshCw class="size-3.5" /> 다시 시도
        </Button>
      </div>

      <BayStatusMatrix
        v-else
        class="mt-6"
        :bays="dashboard?.bays ?? []"
        :selected-bay-id="null"
        :pending="loading"
        @select-bay="openBayDetail"
      />
    </section>
  </div>
</template>
