<script setup lang="ts">
import { Boxes } from '@lucide/vue'

const branding = useBrandingStore()

onMounted(() => {
  void branding.initialize(true)
})
</script>

<template>
  <span class="flex shrink-0 items-center justify-center overflow-hidden">
    <img
      v-if="branding.currentLogo"
      :key="branding.version"
      :src="branding.currentLogo.url"
      alt="사이트 로고"
      class="size-full object-contain"
    />
    <!--    <Boxes v-else class="size-1/2" stroke-width="2.2" aria-hidden="true" />-->
  </span>
</template>
