<script setup lang="ts">
import GlobalAlert from '@/components/global/GlobalAlert.vue'
import { TooltipProvider } from '@/components/ui/tooltip'
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <GlobalAlert />
    </ClientOnly>
  </TooltipProvider>
</template>
