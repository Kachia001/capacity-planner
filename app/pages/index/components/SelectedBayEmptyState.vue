<script lang="ts">
export interface SelectedBayEmptyStateProps {
  totalCompletionRate: number
  totalItems: number
}
</script>

<script setup lang="ts">
defineProps<SelectedBayEmptyStateProps>()
</script>

<template>
  <div class="flex min-h-[48vh] items-center justify-center rounded-md border border-dashed border-emerald-200 bg-white/65 p-8 text-center">
    <div>
      <p class="text-lg font-semibold">
        먼저 위의 bay를 하나 선택하세요.
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        첫 화면에는 bay만 보이도록 두고, 상세 작업은 선택 후 이 영역에 표시합니다.
      </p>
      <p class="mt-4 text-sm text-emerald-700">
        전체 진행률 {{ totalCompletionRate }}% · 전체 작업 {{ totalItems }}건
      </p>
    </div>
  </div>
</template>
