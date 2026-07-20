<script setup lang="ts">
import AdminHeader from '@/components/admin/layout/AdminHeader.vue'
import AdminDesktopSmoothScroll from '@/components/admin/layout/AdminDesktopSmoothScroll.vue'
import AdminMobileNavigation from '@/components/admin/navigation/AdminMobileNavigation.vue'
</script>

<template>
  <AdminDesktopSmoothScroll>
    <div class="min-h-screen bg-[#f2f4ef] text-[#181a18]">
      <AdminHeader />
      <AdminMobileNavigation />
      <main class="flex h-full shrink">
        <AdminNavigationContent
          class="sticky top-20 hidden min-h-[calc(100dvh-5rem)] flex-initial lg:flex"
        />
        <section class="flex-[6] px-8 py-8 xl:px-10 xl:py-10">
          <slot />
        </section>
      </main>
    </div>
  </AdminDesktopSmoothScroll>
</template>
