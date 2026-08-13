<script setup lang="ts">
import { LogIn, LogOut, LoaderCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'

type AttendanceState = {
  isWorking: boolean
  activeSession: { id: number; startedAt: string } | null
}

const state = ref<AttendanceState | null>(null)
const pending = ref(false)
const errorMessage = ref<string | null>(null)

async function refresh() {
  try {
    state.value = await $fetch<AttendanceState>('/api/attendance/me')
  } catch {
    state.value = null
  }
}

async function toggleAttendance() {
  const clockingOut = state.value?.isWorking === true
  const action = clockingOut ? '퇴근' : '출근'
  const confirmed = window.confirm(
    `${action} 처리 후에는 직접 취소하거나 수정할 수 없습니다. 정정이 필요하면 매니저에게 요청해야 합니다. ${action} 처리하시겠습니까?`,
  )
  if (!confirmed) return

  pending.value = true
  errorMessage.value = null
  try {
    await $fetch(`/api/attendance/${clockingOut ? 'clock-out' : 'clock-in'}`, { method: 'POST' })
    await refresh()
  } catch (error) {
    const data = error && typeof error === 'object' && 'data' in error ? error.data : null
    errorMessage.value =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `${action} 처리하지 못했습니다.`
    window.alert(errorMessage.value)
  } finally {
    pending.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="hidden rounded-md px-2 py-1 font-mono text-[9px] font-semibold xl:inline-flex"
      :class="state?.isWorking ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'"
      :title="errorMessage || undefined"
    >
      {{ state?.isWorking ? '근무 중' : '미출근' }}
    </span>
    <Button
      type="button"
      size="sm"
      :variant="state?.isWorking ? 'outline' : 'default'"
      :disabled="pending || !state"
      @click="toggleAttendance"
    >
      <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
      <LogOut v-else-if="state?.isWorking" class="size-3.5" />
      <LogIn v-else class="size-3.5" />
      <span class="hidden sm:inline">{{ state?.isWorking ? '퇴근' : '출근' }}</span>
    </Button>
  </div>
</template>
