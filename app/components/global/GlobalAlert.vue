<script setup lang="ts">
import AlertConfirmationPanel from '@/components/global/AlertConfirmationPanel.vue'

const globalAlert = useGlobalAlertStore()

function acceptAlert(value: string) {
  globalAlert.accept(value)
}

function cancelAlert() {
  globalAlert.cancel()
}

function handleKeydown(event: KeyboardEvent) {
  if (globalAlert.isOpen && event.key === 'Escape') {
    cancelAlert()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="globalAlert.isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[2px]"
        @click="cancelAlert"
      >
        <AlertConfirmationPanel
          :key="globalAlert.requestId"
          :variant="globalAlert.variant"
          :title="globalAlert.title"
          :message="globalAlert.message"
          :confirm-label="globalAlert.confirmLabel"
          :cancel-label="globalAlert.cancelLabel"
          :details="globalAlert.details"
          :acknowledgement-label="globalAlert.acknowledgementLabel"
          :prompt="globalAlert.promptOptions"
          @accept="acceptAlert"
          @cancel="cancelAlert"
        />
      </div>
    </Transition>
  </Teleport>
</template>
