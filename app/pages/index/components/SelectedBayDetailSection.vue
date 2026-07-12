<script setup lang="ts">
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'
import SelectedBayOverview from '@/pages/index/components/SelectedBayOverview.vue'
import type { SelectedBayStatus } from '@/pages/index/components/SelectedBayOverview.vue'
import WorkItemsDetail from '@/pages/index/components/WorkItemsDetail.vue'
import type { DetailMode, WorkItem } from '@/pages/index/components/WorkItemsDetail.vue'

const props = defineProps<{
  summary: BaySelectorBay
  status: SelectedBayStatus
  openCount: number
  issueCount: number
  detailMode: DetailMode
  detailModes: DetailMode[]
  items: WorkItem[]
  detailPending: boolean
}>()

const emit = defineEmits<{
  'update:detailMode': [mode: DetailMode]
}>()

const section = ref<HTMLElement | null>(null)

function scrollIntoView() {
  section.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function updateDetailMode(mode: DetailMode) {
  emit('update:detailMode', mode)
}

defineExpose({ scrollIntoView })
</script>

<template>
  <section ref="section" class="mx-auto w-full max-w-7xl scroll-mt-48 px-4 py-5 sm:px-6 lg:px-8">
    <div class="space-y-4">
      <SelectedBayOverview
        :summary="props.summary"
        :status="props.status"
        :open-count="props.openCount"
        :issue-count="props.issueCount"
      />
      <WorkItemsDetail
        :detail-mode="props.detailMode"
        :detail-modes="props.detailModes"
        :items="props.items"
        :detail-pending="props.detailPending"
        @update:detail-mode="updateDetailMode"
      />
    </div>
  </section>
</template>
