<script setup lang="ts">
import { FilePlus2, Plus } from '@lucide/vue'
</script>

<template>
  <div class="flex items-center overflow-hidden rounded-sm shadow-sm">
    <NuxtLink
      to="/admin/bays/new"
      class="inline-flex h-9 items-center gap-2 bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 sm:text-sm"
      ><Plus class="size-4" />새 BAY</NuxtLink
    >
    <NuxtLink
      to="/admin/bay-templates/new"
      aria-label="새 BAY 템플릿"
      title="새 BAY 템플릿"
      class="inline-flex size-9 items-center justify-center border-l border-emerald-500 bg-emerald-700 text-white transition hover:bg-emerald-600"
      ><FilePlus2 class="size-4"
    /></NuxtLink>
  </div>
</template>
