<script setup lang="ts">
import { ArrowLeft, ShieldX } from '@lucide/vue'

definePageMeta({
  middleware: 'auth-client',
})

useHead({
  title: '접근 권한 없음 · Capacity Planner',
})
</script>

<template>
  <section class="flex flex-1 items-center justify-center bg-[#edf2ee] px-4 py-16">
    <div class="w-full max-w-xl overflow-hidden rounded-md border border-zinc-300 bg-white shadow-[0_24px_80px_-50px_rgba(15,23,42,0.7)]">
      <div class="border-b border-zinc-800 bg-zinc-950 p-6 text-white">
        <div class="flex size-12 items-center justify-center rounded-sm border border-red-400/50 bg-red-400/10 text-red-300">
          <ShieldX class="size-6" />
        </div>
        <p class="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-red-300">
          Access denied / 403
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">
          이 작업을 수행할 권한이 없습니다.
        </h1>
      </div>
      <div class="p-6">
        <p class="text-sm leading-6 text-zinc-600">
          새 BAY 생성과 템플릿 구성은 관리자에게만 허용됩니다. 권한이 필요하면 시스템 관리자에게 문의하세요.
        </p>
        <NuxtLink
          to="/"
          class="mt-6 inline-flex h-10 items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          <ArrowLeft class="size-4" /> Dashboard로 돌아가기
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
