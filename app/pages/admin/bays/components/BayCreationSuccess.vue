<script setup lang="ts">
import { CheckCircle2, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  bayCode: string
  itemCount: number
  highAltitudeCount: number
}>()
</script>

<template>
  <div class="mx-auto flex min-h-136 max-w-3xl items-center px-4 py-16">
    <Card class="w-full items-center py-8 text-center shadow-xl">
      <CardHeader class="items-center">
        <CheckCircle2 class="size-12 text-emerald-600" />
        <CardTitle class="mt-3 text-2xl"> {{ props.bayCode }} BAY가 준비되었습니다. </CardTitle>
      </CardHeader>
      <CardContent class="text-muted-foreground">
        {{ props.itemCount }}개 작업과 고소작업 {{ props.highAltitudeCount }}건이 현재 확정 구성으로
        생성되었습니다.
      </CardContent>
      <CardFooter>
        <Button as-child size="lg">
          <NuxtLink :to="{ path: '/admin/bays', query: { q: props.bayCode } }">
            Bay 목록에서 확인 <ChevronRight />
          </NuxtLink>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
