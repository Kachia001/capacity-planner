<script setup lang="ts">
import { Database, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BaySelector from '@/pages/index/components/BaySelector.vue'
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'

interface BayHealth {
  total: number
  issueBays: number
  openBays: number
  completeBays: number
}

const props = defineProps<{
  selectedBay: BaySelectorBay
  bays: BaySelectorBay[]
  bayHealth: BayHealth
  pending: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  refresh: []
  select: [bay: string]
}>()

function refreshBoard() {
  emit('refresh')
}

function selectBay(bay: string) {
  emit('select', bay)
}
</script>

<template>
  <section class="sticky top-0 z-30 border-b border-emerald-200/70 bg-white/95 shadow-sm backdrop-blur">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Database class="size-4" />
            Admin Bay Board
          </p>
          <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ props.selectedBay.bay }} 데이터</h1>
        </div>

        <div class="flex flex-col gap-2 md:items-end">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline">전체 {{ props.bayHealth.total }} bays</Badge>
            <Badge :variant="props.bayHealth.issueBays > 0 ? 'destructive' : 'secondary'">이슈 {{ props.bayHealth.issueBays }}</Badge>
            <Badge variant="secondary">미완료 {{ props.bayHealth.openBays }}</Badge>
            <Badge variant="outline">완료 {{ props.bayHealth.completeBays }}</Badge>
          </div>
          <Button variant="outline" size="sm" :disabled="props.pending" class="w-fit" @click="refreshBoard">
            <RefreshCw class="mr-2 size-4" :class="props.pending ? 'animate-spin' : ''" />
            {{ props.pending ? '동기화 중' : '새로고침' }}
          </Button>
        </div>
      </div>

      <Alert v-if="props.errorMessage" variant="destructive">
        <AlertTitle>DB 연결 확인 필요</AlertTitle>
        <AlertDescription>{{ props.errorMessage }}</AlertDescription>
      </Alert>

      <BaySelector
        :bays="props.bays"
        :selected-bay="props.selectedBay.bay"
        :pending="props.pending"
        @select="selectBay"
      />
    </div>
  </section>
</template>
