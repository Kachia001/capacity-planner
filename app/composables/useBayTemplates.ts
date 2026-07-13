import type { ExistingTemplateDraft, TemplateGroupDraft, TemplateItemDraft } from '@/types/template'

type TemplateApiRow = Omit<TemplateItemDraft, 'clientId' | 'legacySourceRow'> & {
  workNo: number | null
  workName: string | null
}

type TemplateApiResponse = {
  id: string
  name: string
  description: string
  updatedAt: string
  rows: TemplateApiRow[]
}

let generatedId = 0

export function makeTemplateClientId(prefix: string) {
  generatedId += 1
  return `${prefix}-${Date.now()}-${generatedId}`
}

export function cloneTemplateGroups(groups: TemplateGroupDraft[]): TemplateGroupDraft[] {
  return groups.map((group, groupIndex) => ({
    ...group,
    clientId: makeTemplateClientId('group'),
    sortOrder: groupIndex + 1,
    items: group.items.map((item, itemIndex) => ({
      ...item,
      clientId: makeTemplateClientId('item'),
      sortOrder: itemIndex + 1,
    })),
  }))
}

export function createBlankTemplateGroups(): TemplateGroupDraft[] {
  return [
    {
      clientId: makeTemplateClientId('group'),
      sortOrder: 1,
      kind: 'work',
      workNo: null,
      workName: '',
      items: [
        {
          clientId: makeTemplateClientId('item'),
          sortOrder: 1,
          legacySourceRow: null,
          workDetail: '',
          vendor: '',
          partNo: '',
          itemName: '',
          bolt: '',
          isHighAltitude: false,
          safetyNote: '',
        },
      ],
    },
  ]
}

export function mapTemplateResponse(template: TemplateApiResponse): ExistingTemplateDraft {
  const groups: TemplateGroupDraft[] = []

  for (const row of template.rows) {
    const key = row.workName?.trim() || '__material__'
    let group = groups.at(-1)
    if (!group || (group.workName || '__material__') !== key) {
      group = {
        clientId: makeTemplateClientId('group'),
        sortOrder: groups.length + 1,
        kind: row.workName ? 'work' : 'material',
        workNo: row.workNo,
        workName: row.workName ?? '',
        items: [],
      }
      groups.push(group)
    }
    group.items.push({
      clientId: makeTemplateClientId('item'),
      sortOrder: group.items.length + 1,
      legacySourceRow: null,
      workDetail: row.workDetail ?? '',
      vendor: row.vendor ?? '',
      partNo: row.partNo ?? '',
      itemName: row.itemName ?? '',
      bolt: row.bolt ?? '',
      isHighAltitude: row.isHighAltitude,
      safetyNote: row.safetyNote ?? '',
    })
  }

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sourceBay: '템플릿',
    updatedAtLabel: new Date(template.updatedAt).toLocaleDateString('ko-KR'),
    usedByBayCount: 0,
    groups,
  }
}

export async function fetchBayTemplates(accessToken: string) {
  const templates = await $fetch<TemplateApiResponse[]>('/api/bay-templates', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return templates.map(mapTemplateResponse)
}
