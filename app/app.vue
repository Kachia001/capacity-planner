<script setup lang="ts">
import Footer from '@/components/layout/Footer.vue'
import GlobalAlert from '@/components/global/GlobalAlert.vue'
import Header from '@/components/layout/Header.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f6fbf8] text-zinc-950">
    <Header />
    <NuxtRouteAnnouncer />
    <main class="flex flex-1 flex-col">
      <NuxtPage />
    </main>
    <Footer />
    <ClientOnly>
      <GlobalAlert />
    </ClientOnly>
  </div>
</template>
