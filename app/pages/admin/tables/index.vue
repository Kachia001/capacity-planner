<script setup lang="ts">
import { RefreshCw, TriangleAlert } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import TableFloorPlan from '@/components/operations/TableFloorPlan.vue'
import { fetchWorkTables, getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { WorkTablesResponse } from '#shared/api/tables/table.contract'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager', 'worker'],
})
useHead({ title: '테이블 배치 · Capacity Planner' })

const auth = useAuthStore()
const data = ref<WorkTablesResponse | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)

async function loadTables() {
  loading.value = true
  errorMessage.value = null
  try {
    await auth.initialize()
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    data.value = await fetchWorkTables()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '테이블 배치 정보를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

function openTable(number: number) {
  void navigateTo(`/admin/tables/${number}`)
}

onMounted(loadTables)
</script>

<template>
  <main class="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Table allocation map
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#171a17] sm:text-[2rem]">
            테이블별 BAY 배치를 확인합니다.
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            001~018 테이블은 각각 하나의 BAY를 가집니다. 진행률과 미해결 이슈를 배치도에서 바로
            확인할 수 있습니다.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          tone="neutral"
          size="md"
          :loading="loading"
          loading-text="갱신 중"
          @click="loadTables"
        >
          <RefreshCw class="size-3.5" /> 최신 정보
        </Button>
      </div>

      <dl
        class="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white sm:grid-cols-4"
      >
        <div class="border-b border-r border-[#e4e7e1] p-4 sm:border-b-0">
          <dt class="text-[10px] text-[#8d958b]">전체 테이블</dt>
          <dd class="mt-1 font-mono text-2xl font-semibold">
            {{ data?.summary.totalTables ?? 18 }}
          </dd>
        </div>
        <div class="border-b border-[#e4e7e1] p-4 sm:border-b-0 sm:border-r">
          <dt class="text-[10px] text-[#8d958b]">BAY 배치</dt>
          <dd class="mt-1 font-mono text-2xl font-semibold text-[#526e3f]">
            {{ data?.summary.assignedTables ?? 0 }}
          </dd>
        </div>
        <div class="border-r border-[#e4e7e1] p-4">
          <dt class="text-[10px] text-[#8d958b]">미배치</dt>
          <dd class="mt-1 font-mono text-2xl font-semibold">
            {{ data?.summary.emptyTables ?? 18 }}
          </dd>
        </div>
        <div class="p-4">
          <dt class="text-[10px] text-[#8d958b]">미해결 이슈</dt>
          <dd class="mt-1 font-mono text-2xl font-semibold text-red-700">
            {{ data?.summary.openIssues ?? 0 }}
          </dd>
        </div>
      </dl>

      <div
        v-if="errorMessage"
        class="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-center"
      >
        <TriangleAlert class="size-8 text-red-600" />
        <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
      </div>
      <TableFloorPlan
        v-else
        class="mt-6"
        :tables="data?.tables ?? []"
        :pending="loading"
        :can-manage="auth.isSupervisor"
        @select="openTable"
      />
    </section>
  </main>
</template>
