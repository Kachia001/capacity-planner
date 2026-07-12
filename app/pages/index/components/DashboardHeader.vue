<script lang="ts">
export interface BayHealth {
  total: number
  issueBays: number
  openBays: number
  completeBays: number
}

export interface DashboardHeaderProps {
  bayHealth: BayHealth
  userEmail?: string
  pending: boolean
}
</script>

<script setup lang="ts">
import { Database, RefreshCw } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

defineProps<DashboardHeaderProps>()

defineEmits<{
  refresh: []
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <p class="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <Database class="size-4" />
        Capacity Planner · Bay Board
      </p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight">
        Bay를 선택하면 상세가 아래에 열립니다
      </h1>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          전체 {{ bayHealth.total }} bays
        </Badge>
        <Badge :variant="bayHealth.issueBays > 0 ? 'destructive' : 'secondary'">
          이슈 {{ bayHealth.issueBays }}
        </Badge>
        <Badge variant="secondary">
          미완료 {{ bayHealth.openBays }}
        </Badge>
        <Badge variant="outline">
          완료 {{ bayHealth.completeBays }}
        </Badge>
        <span class="text-sm text-muted-foreground">
          {{ userEmail }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="pending"
          @click="$emit('refresh')"
        >
          <RefreshCw class="mr-2 size-4" :class="pending ? 'animate-spin' : ''" />
          {{ pending ? '동기화 중' : '새로고침' }}
        </Button>
      </div>
    </div>
  </div>
</template>
