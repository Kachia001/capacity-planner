<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3 } from '@lucide/vue'
import BayBoardLandingSection from '@/pages/index/components/BayBoardLandingSection.vue'
import SelectedBayBoardHeader from '@/pages/index/components/SelectedBayBoardHeader.vue'
import SelectedBayDetailSection from '@/pages/index/components/SelectedBayDetailSection.vue'
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'
import type { SelectedBayStatus } from '@/pages/index/components/SelectedBayOverview.vue'
import type { DetailMode, WorkItem } from '@/pages/index/components/WorkItemsDetail.vue'

definePageMeta({
  middleware: 'auth-client',
})

const detailModes: DetailMode[] = ['attention', 'open', 'all']

const planner = usePlannerStore()
const auth = useAuthStore()
const detailSection = ref<InstanceType<typeof SelectedBayDetailSection> | null>(null)
const detailMode = ref<DetailMode>('attention')
const booting = ref(true)

const selectedBaySummary = computed<BaySelectorBay | null>(() =>
  planner.baySummaries.find(summary => summary.bay === planner.selectedBay) ?? null,
)

const bayHealth = computed(() => ({
  total: planner.baySummaries.length,
  issueBays: planner.baySummaries.filter(bay => bay.issues > 0).length,
  openBays: planner.baySummaries.filter(bay => bay.completionRate < 100).length,
  completeBays: planner.baySummaries.filter(bay => bay.completionRate === 100).length,
}))

const boardPending = computed(() => booting.value || planner.pending)

const sortedBays = computed<BaySelectorBay[]>(() =>
  [...planner.baySummaries].sort((a, b) =>
    a.bay.localeCompare(b.bay, undefined, { numeric: true, sensitivity: 'base' }),
  ),
)

const selectedOpenCount = computed(() =>
  planner.selectedBayItems.filter(item => !item.isCompleted).length,
)

const selectedIssueCount = computed(() =>
  planner.selectedBayItems.filter(item => item.hasIssue).length,
)

const filteredSelectedItems = computed<WorkItem[]>(() => {
  if (detailMode.value === 'attention') {
    return planner.selectedBayItems.filter(item => item.hasIssue || !item.isCompleted)
  }

  if (detailMode.value === 'open') {
    return planner.selectedBayItems.filter(item => !item.isCompleted)
  }

  return planner.selectedBayItems
})

const selectedBayStatus = computed<SelectedBayStatus>(() => {
  if (!selectedBaySummary.value) {
    return {
      label: 'Bay를 선택하세요',
      description: '상단에 고정된 bay 목록에서 확인할 bay를 누르면 상세가 아래에 열립니다.',
      variant: 'secondary',
      icon: Clock3,
    }
  }

  if (selectedBaySummary.value.issues > 0) {
    return {
      label: '이슈 확인 필요',
      description: `${selectedBaySummary.value.issues}건의 이슈가 기록되어 있습니다.`,
      variant: 'destructive',
      icon: AlertCircle,
    }
  }

  if (selectedBaySummary.value.completionRate < 100) {
    return {
      label: '미완료 작업 남음',
      description: `${selectedOpenCount.value}건의 미완료 작업이 남아 있습니다.`,
      variant: 'secondary',
      icon: Clock3,
    }
  }

  return {
    label: '완료',
    description: '현재 선택 bay의 작업이 모두 완료되었습니다.',
    variant: 'default',
    icon: CheckCircle2,
  }
})

onMounted(async () => {
  try {
    await auth.initialize()

    if (auth.user) {
      await planner.loadWorkItems()
    }
  } finally {
    booting.value = false
  }
})

async function selectBay(bay: string) {
  if (planner.selectedBay === bay) {
    planner.clearSelectedBay()
    detailMode.value = 'attention'
    return
  }

  await planner.selectBay(bay)
  await nextTick()

  detailSection.value?.scrollIntoView()
}
</script>

<template>
  <BayBoardLandingSection
    v-if="!selectedBaySummary"
    :bays="sortedBays"
    :pending="boardPending"
    :error-message="planner.errorMessage"
    @select="selectBay"
  />

  <template v-else>
    <SelectedBayBoardHeader
      :selected-bay="selectedBaySummary"
      :bays="sortedBays"
      :bay-health="bayHealth"
      :pending="planner.pending"
      :error-message="planner.errorMessage"
      @refresh="planner.loadWorkItems"
      @select="selectBay"
    />

    <SelectedBayDetailSection
      ref="detailSection"
      v-model:detail-mode="detailMode"
      :summary="selectedBaySummary"
      :status="selectedBayStatus"
      :open-count="selectedOpenCount"
      :issue-count="selectedIssueCount"
      :detail-modes="detailModes"
      :items="filteredSelectedItems"
      :detail-pending="planner.detailPending"
    />
  </template>
</template>
