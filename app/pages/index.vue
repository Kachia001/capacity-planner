<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth-client',
    () => {
      const auth = useAuthStore()
      return navigateTo(auth.isSupervisor ? '/admin' : '/bay', { replace: true })
    },
  ],
})
</script>

<template>
  <div aria-hidden="true" />
</template>
