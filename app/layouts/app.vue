<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppDesktopSmoothScroll from '@/components/layout/AppDesktopSmoothScroll.vue'
import AppNavigationContent from '@/components/navigation/AppNavigationContent.vue'
</script>

<template>
  <AppDesktopSmoothScroll>
    <div class="min-h-screen bg-[#f2f4ef] text-[#181a18]">
      <AppHeader />
      <main class="flex min-w-0 flex-1">
        <AppNavigationContent
          class="sticky top-20 hidden min-h-[calc(100dvh-5rem)] flex-initial md:flex"
        />
        <section class="min-w-0 flex-1">
          <slot />
        </section>
      </main>
    </div>
  </AppDesktopSmoothScroll>
</template>
