<script setup lang="ts">
import { ArrowLeft, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  bayListPath: string
  templateCreatePath: string
}>()
</script>

<template>
  <header class="border-b border-zinc-300 bg-[#f8faf7]">
    <div class="mx-auto w-full max-w-368 px-4 py-6 sm:px-6 lg:px-8">
      <Button as-child variant="ghost" class="-ml-2 text-muted-foreground">
        <NuxtLink :to="props.bayListPath"> <ArrowLeft /> 운영 현황 </NuxtLink>
      </Button>
      <div class="mt-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-700">
            Bay commissioning
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            직접 구성하거나 생성 옵션에서 시작하세요.
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            빈 작업 구성부터 직접 작성하거나 기존 베이 생성 옵션을 복사할 수 있습니다. 어느 방식을
            선택해도 이 Bay만의 독립적인 작업 목록으로 저장됩니다.
          </p>
        </div>
        <Button as-child variant="outline" size="lg" class="bg-card">
          <NuxtLink :to="props.templateCreatePath"> <Plus /> 새 생성 옵션 만들기 </NuxtLink>
        </Button>
      </div>
    </div>
  </header>
</template>
