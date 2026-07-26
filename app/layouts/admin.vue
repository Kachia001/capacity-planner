<script setup lang="ts">
import AdminHeader from '@/components/admin/layout/AdminHeader.vue'
import AdminDesktopSmoothScroll from '@/components/admin/layout/AdminDesktopSmoothScroll.vue'
</script>

<template>
  <AdminDesktopSmoothScroll>
    <div class="min-h-screen bg-[#f2f4ef] text-[#181a18]">
      <AdminHeader />
      <main class="flex min-w-0 flex-1">
        <AdminNavigationContent
          class="sticky top-20 hidden min-h-[calc(100dvh-5rem)] flex-initial lg:flex"
        />
        <section class="min-w-0 flex-1">
          <slot />
        </section>
      </main>
    </div>
  </AdminDesktopSmoothScroll>
</template>
