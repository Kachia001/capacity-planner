<script setup lang="ts">
import { LockKeyhole, Plus } from '@lucide/vue'

const props = defineProps<{
  enabled: boolean
}>()
</script>

<template>
  <NuxtLink
    v-if="props.enabled"
    to="/admin/bays/new"
    class="inline-flex h-9 items-center gap-2 rounded-sm bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:text-sm"
  >
    <Plus class="size-4" />
    새 BAY
  </NuxtLink>

  <div v-else class="group relative" tabindex="0" aria-describedby="admin-action-tooltip">
    <button
      type="button"
      disabled
      class="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-400 opacity-80 sm:text-sm"
    >
      <LockKeyhole class="size-4" />
      새 BAY
    </button>
    <div
      id="admin-action-tooltip"
      role="tooltip"
      class="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-56 translate-y-1 rounded-md bg-zinc-950 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition duration-150 before:absolute before:-top-1 before:right-5 before:size-2 before:rotate-45 before:bg-zinc-950 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100"
    >
      관리자만 사용할 수 있습니다.
    </div>
  </div>
</template>
