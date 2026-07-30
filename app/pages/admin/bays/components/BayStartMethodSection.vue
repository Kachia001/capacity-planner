<script setup lang="ts">
import { Layers3, Plus } from '@lucide/vue'
import { computed } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExistingTemplateDraft } from '@/types/template'

const props = defineProps<{
  templates: ExistingTemplateDraft[]
  selectedTemplateId: string
  directWriteId: string
  loading: boolean
  loadError: string | null
  editingWorkConfiguration: boolean
  templateCreatePath: string
}>()

const emit = defineEmits<{
  'update:selectedTemplateId': [value: string]
  'edit-template': [templateId: string]
}>()

function handleStartMethodChange(value: string) {
  emit('update:selectedTemplateId', value)
}

function editTemplate(templateId: string) {
  emit('edit-template', templateId)
}

const selectedMethod = computed({
  get: () => props.selectedTemplateId,
  set: handleStartMethodChange,
})
</script>

<template>
  <Card class="gap-0 py-0 shadow-sm">
    <CardHeader class="flex-row items-center justify-between gap-3 rounded-none border-b py-4">
      <div class="flex items-center gap-3">
        <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
          <Layers3 class="size-4" />
        </span>
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
            02 / blueprint
          </p>
          <CardTitle>시작 방식</CardTitle>
        </div>
      </div>
      <Badge variant="secondary">생성 옵션 {{ props.templates.length }}개</Badge>
    </CardHeader>

    <CardContent v-if="props.loading" class="grid min-h-56 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="index in 3" :key="index" class="h-32" />
    </CardContent>

    <CardContent v-else class="space-y-5 p-5">
      <Alert v-if="props.loadError" class="border-amber-300 bg-amber-50 text-amber-950">
        <AlertDescription>
          {{ props.loadError }} 직접 작성은 계속 사용할 수 있습니다.
        </AlertDescription>
      </Alert>

      <RadioGroup v-model="selectedMethod" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label class="cursor-pointer">
          <Card
            class="relative h-full gap-0 py-0 transition"
            :class="
              props.selectedTemplateId === props.directWriteId
                ? 'ring-2 ring-primary'
                : 'hover:ring-foreground/30'
            "
          >
            <RadioGroupItem
              :value="props.directWriteId"
              class="absolute right-4 top-4"
              aria-label="직접 작성"
            />
            <CardContent class="p-4 pr-12">
              <p class="font-semibold">직접 작성</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                생성 옵션 없이 빈 작업 그룹부터 직접 구성합니다.
              </p>
              <p class="mt-4 font-mono text-[10px] uppercase text-muted-foreground">
                No option · blank start
              </p>
            </CardContent>
          </Card>
        </label>

        <div v-for="template in props.templates" :key="template.id" class="relative">
          <label class="block h-full cursor-pointer">
            <Card
              class="relative h-full gap-0 py-0 transition"
              :class="
                props.selectedTemplateId === template.id
                  ? 'ring-2 ring-primary'
                  : 'hover:ring-foreground/30'
              "
            >
              <RadioGroupItem
                :value="template.id"
                class="absolute right-4 top-4"
                :aria-label="template.name"
              />
              <CardContent class="p-4 pb-14 pr-12">
                <p class="font-semibold">{{ template.name }}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ template.description || '설명 없음' }}
                </p>
                <p class="mt-4 font-mono text-[10px] uppercase text-muted-foreground">
                  {{ template.groups.length }} groups ·
                  {{ template.groups.reduce((sum, group) => sum + group.items.length, 0) }} items
                </p>
              </CardContent>
            </Card>
          </label>
          <Button
            v-if="props.selectedTemplateId !== template.id || !props.editingWorkConfiguration"
            type="button"
            variant="outline"
            tone="neutral"
            size="xs"
            shape="compact"
            class="absolute bottom-3 left-4 bg-white text-[11px]"
            @click.stop="editTemplate(template.id)"
          >
            작업 내용 변경 후 생성
          </Button>
          <Badge v-else variant="secondary" class="absolute bottom-3 left-4 text-[10px]">
            작업 편집 중
          </Badge>
        </div>
      </RadioGroup>

      <Alert
        v-if="props.templates.length === 0 && !props.loadError"
        class="items-center sm:grid-cols-[1fr_auto]"
      >
        <div>
          <p class="text-sm font-semibold">등록된 베이 생성 옵션이 없습니다.</p>
          <AlertDescription>직접 작성하거나 새 생성 옵션을 만들 수 있습니다.</AlertDescription>
        </div>
        <Button as-child size="sm">
          <NuxtLink :to="props.templateCreatePath"> <Plus /> 생성 옵션 만들기 </NuxtLink>
        </Button>
      </Alert>
    </CardContent>
  </Card>
</template>
