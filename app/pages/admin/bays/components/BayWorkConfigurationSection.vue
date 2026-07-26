<script setup lang="ts">
import { PencilRuler, TriangleAlert } from '@lucide/vue'
import TemplateGroupEditor from '@/components/admin/bay-wizard/TemplateGroupEditor.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TemplateGroupDraft } from '@/types/template'

const props = defineProps<{
  groups: TemplateGroupDraft[]
  isDirectWrite: boolean
  invalidGroupCount: number
  emptyItemCount: number
}>()

const emit = defineEmits<{
  'update:groups': [value: TemplateGroupDraft[]]
}>()

const editableGroups = computed({
  get: () => props.groups,
  set: value => emit('update:groups', value),
})
</script>

<template>
  <section
    v-if="props.groups.length"
    class="xl:sticky xl:top-24 xl:self-start xl:h-[85dvh] overflow-hidden"
  >
    <Card class="py-0 shadow-sm flex flex-col gap-0 h-full">
      <CardHeader class="flex-row items-center gap-3 py-4 border-b">
        <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
          <PencilRuler class="size-4" />
        </span>
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            03 / final review
          </p>
          <CardTitle>이 BAY의 최종 작업 구성</CardTitle>
          <CardDescription>
            {{
              props.isDirectWrite
                ? '템플릿 없이 이 BAY의 작업을 직접 구성합니다.'
                : '여기서 수정한 내용은 원본 템플릿에 영향을 주지 않습니다.'
            }}
          </CardDescription>
        </div>
      </CardHeader>
      <TemplateGroupEditor v-model:groups="editableGroups" />
    </Card>
  </section>

  <!--  <Alert-->
  <!--    v-if="props.invalidGroupCount || props.emptyItemCount"-->
  <!--    class="border-amber-300 bg-amber-50 text-amber-950"-->
  <!--  >-->
  <!--    <TriangleAlert />-->
  <!--    <AlertDescription>-->
  <!--      작업명 미입력 그룹 {{ props.invalidGroupCount }}개, 완전히 빈 상세 작업-->
  <!--      {{ props.emptyItemCount }}개를 확인하세요.-->
  <!--    </AlertDescription>-->
  <!--  </Alert>-->
</template>
