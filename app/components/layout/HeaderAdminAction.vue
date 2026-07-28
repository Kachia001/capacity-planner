<script setup lang="ts">
import { FilePlus2, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="flex items-center overflow-hidden rounded-sm shadow-sm">
    <Button
      as-child
      variant="solid"
      tone="success"
      size="md"
      shape="compact"
      class="rounded-r-none text-xs sm:text-sm"
    >
      <NuxtLink to="/admin/bays/new"><Plus class="size-4" />새 BAY</NuxtLink>
    </Button>
    <Button
      as-child
      variant="solid"
      tone="success"
      size="icon-md"
      shape="compact"
      class="rounded-l-none border-l border-emerald-500"
    >
      <NuxtLink to="/admin/bay-templates/new" aria-label="새 BAY 템플릿">
        <FilePlus2 class="size-4" />
      </NuxtLink>
    </Button>
  </div>
</template>
