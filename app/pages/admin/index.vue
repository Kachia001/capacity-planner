<script setup lang="ts">
import { ArrowUpRight, RefreshCw, TriangleAlert } from '@lucide/vue'
import BayStatusMatrix from '@/components/operations/BayStatusMatrix.vue'
import { fetchOperationsDashboard, getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { OperationsDashboardResponse } from '@/types/operations'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: '운영 현황 · Capacity Planner Admin' })

const auth = useAuthStore()
const dashboard = ref<OperationsDashboardResponse | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref<string | null>(null)

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
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    dashboard.value = await fetchOperationsDashboard(accessToken)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Bay 운영 현황을 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[100rem] px-8 py-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div class="flex items-end justify-between gap-8">
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Operations overview
          </p>
          <h2 class="mt-2 text-[2rem] font-semibold tracking-[-0.045em] text-[#171a17]">
            전체 Bay 운영 상태를 한눈에 확인합니다.
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            상태 분포에서 진행률과 이슈를 확인하고 필요한 Bay의 작업 상세로 바로 이동할 수 있습니다.
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <NuxtLink
            to="/admin/bays"
            class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cdd2c9] bg-white px-4 text-xs font-semibold text-[#414840] transition hover:border-[#949d91] hover:bg-[#fafbf8]"
          >
            Bay 목록 열기 <ArrowUpRight class="size-3.5" />
          </NuxtLink>
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#171b18] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(23,27,24,0.14)] transition hover:bg-[#2d352e] disabled:opacity-50"
            :disabled="loading || refreshing"
            @click="loadOverview(true)"
          >
            <RefreshCw class="size-3.5" :class="refreshing ? 'animate-spin' : ''" />
            최신 정보
          </button>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-center"
      >
        <TriangleAlert class="size-8 text-red-600" />
        <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          @click="loadOverview()"
        >
          <RefreshCw class="size-3.5" /> 다시 시도
        </button>
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
