<script setup lang="ts">
import GlobalAlert from '@/components/global/GlobalAlert.vue'
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <GlobalAlert />
  </ClientOnly>
</template>
