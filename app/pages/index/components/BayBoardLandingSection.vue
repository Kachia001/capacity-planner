<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AdminBayGrid from '@/pages/index/components/AdminBayGrid.vue'
import type { BaySelectorBay } from '@/pages/index/components/BaySelector.vue'

const props = defineProps<{
  bays: BaySelectorBay[]
  pending: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  select: [bay: string]
}>()

function selectBay(bay: string) {
  emit('select', bay)
}
</script>

<template>
  <section class="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
    <div class="w-full space-y-4">
      <Alert v-if="props.errorMessage" variant="destructive" class="bg-white">
        <AlertTitle>DB 연결 확인 필요</AlertTitle>
        <AlertDescription>{{ props.errorMessage }}</AlertDescription>
      </Alert>

      <AdminBayGrid :bays="props.bays" :pending="props.pending" @select="selectBay" />
    </div>
  </section>
</template>
