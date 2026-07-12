<script lang="ts">
import type { Component } from 'vue'
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'

export interface SelectedBayStatus {
  label: string
  description: string
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  icon: Component
}

export interface SelectedBayOverviewProps {
  summary: BaySelectorBay
  status: SelectedBayStatus
  openCount: number
  issueCount: number
}
</script>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<SelectedBayOverviewProps>()
</script>

<template>
  <section class="rounded-md border border-emerald-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-4">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="status.variant">
            <component :is="status.icon" class="mr-1 size-3.5 overflow-visible" />
            {{ status.label }}
          </Badge>
          <Badge variant="outline">
            선택 bay
          </Badge>
        </div>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight">
          {{ summary.bay }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ status.description }}
        </p>
      </div>

      <div class="grid gap-2 text-center text-sm sm:grid-cols-3">
        <div class="rounded-md bg-emerald-50 p-3">
          <div class="text-xl font-semibold">{{ summary.total }}</div>
          <div class="text-xs text-muted-foreground">전체</div>
        </div>
        <div class="rounded-md bg-amber-50 p-3">
          <div class="text-xl font-semibold">{{ openCount }}</div>
          <div class="text-xs text-muted-foreground">미완료</div>
        </div>
        <div class="rounded-md bg-red-50 p-3">
          <div class="text-xl font-semibold">{{ issueCount }}</div>
          <div class="text-xs text-muted-foreground">이슈</div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <div class="mb-2 flex items-center justify-between text-sm">
        <span class="font-medium">진행률</span>
        <span>{{ summary.completionRate }}%</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-emerald-100">
        <div
          class="h-full rounded-full bg-emerald-500 transition-all"
          :style="{ width: `${summary.completionRate}%` }"
        />
      </div>
    </div>
  </section>
</template>
