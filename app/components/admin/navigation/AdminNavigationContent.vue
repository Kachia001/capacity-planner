<script setup lang="ts">
import { Boxes, ChevronRight, PanelsTopLeft, UsersRound } from '@lucide/vue'

const route = useRoute()

const navigation = [
  {
    label: 'Bay 조회',
    caption: 'Bay registry',
    to: '/admin/bays',
    icon: PanelsTopLeft,
  },
  {
    label: '계정관리',
    caption: 'Account control',
    to: '/admin/accounts',
    icon: UsersRound,
  },
]

function isNavigationActive(to: string) {
  if (to === '/admin/bays') {
    return (
      route.path === '/bay' ||
      route.path.startsWith('/admin/bays') ||
      route.path.startsWith('/admin/bay-templates')
    )
  }

  return route.path.startsWith(to)
}
</script>

<template>
  <aside class="flex h-full justify-between flex-1 flex-col bg-[#111512] text-white">
    <nav class="flex flex-col px-4 py-7" aria-label="관리자 주 메뉴">
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="group flex min-h-14 items-center gap-3 rounded-lg border px-3.5 py-2.5 transition duration-200"
        :class="
          isNavigationActive(item.to)
            ? 'border-[#c5f277]/20 bg-[#c5f277] text-[#111512] shadow-[0_10px_30px_rgba(0,0,0,0.18)]'
            : 'border-transparent text-zinc-400 hover:border-white/6 hover:bg-white/4 hover:text-white'
        "
        :aria-current="isNavigationActive(item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-4.5 shrink-0" stroke-width="1.9" />
        <span class="min-w-0 flex-1">
          <strong class="block text-sm font-semibold">{{ item.label }}</strong>
          <span
            class="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.16em]"
            :class="isNavigationActive(item.to) ? 'text-[#111512]/55' : 'text-zinc-600'"
          >
            {{ item.caption }}
          </span>
        </span>
        <ChevronRight
          class="size-3.5 transition-transform group-hover:translate-x-0.5"
          :class="isNavigationActive(item.to) ? 'opacity-70' : 'opacity-0'"
        />
      </NuxtLink>
    </nav>

    <div class="relative shrink-0 border-t border-white/[0.07] px-7 py-5">
      <div
        class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-zinc-600"
      >
        <span class="size-1.5 rounded-full bg-[#c5f277] shadow-[0_0_10px_rgba(197,242,119,0.8)]" />
        System online
      </div>
      <p class="mt-2 text-xs text-zinc-500">Capacity operations · v1.0</p>
    </div>
  </aside>
</template>
