import type { PackingListDetail, PackingSectionDraft, PackingTemplateDraft } from '@/types/packing'

let generatedPackingId = 0

export function makePackingClientId(prefix: string) {
  generatedPackingId += 1
  return `${prefix}-${Date.now()}-${generatedPackingId}`
}

export function clonePackingSections(sections: PackingSectionDraft[]): PackingSectionDraft[] {
  return sections.map((section, sectionIndex) => ({
    ...section,
    clientId: makePackingClientId('packing-section'),
    sortOrder: sectionIndex + 1,
    rows: section.rows.map((row, rowIndex) => ({
      ...row,
      clientId: makePackingClientId('packing-row'),
      sortOrder: rowIndex + 1,
    })),
  }))
}

export function createBlankPackingSections(): PackingSectionDraft[] {
  return [
    {
      clientId: makePackingClientId('packing-section'),
      sortOrder: 1,
      name: '',
      memo: '',
      rows: [
        {
          clientId: makePackingClientId('packing-row'),
          sortOrder: 1,
          label: '',
          isChecked: false,
          memo: '',
        },
      ],
    },
  ]
}

export async function fetchPackingTemplates() {
  return await $fetch<PackingTemplateDraft[]>('/api/packing-list-templates')
}

export async function fetchBayPackingList(bayId: string) {
  return await $fetch<PackingListDetail | null>(`/api/bays/${bayId}/packing-list`)
}

export async function assignBayPackingList(bayId: string, sections: PackingSectionDraft[]) {
  return await $fetch<PackingListDetail>(`/api/bays/${bayId}/packing-list`, {
    method: 'POST',
    body: { sections: clonePackingSections(sections) },
  })
}

export async function saveBayPackingList(
  bayId: string,
  payload: Pick<PackingListDetail, 'memo' | 'version' | 'sections'>,
) {
  return await $fetch<PackingListDetail>(`/api/bays/${bayId}/packing-list`, {
    method: 'PUT',
    body: {
      ...payload,
      sections: clonePackingSections(payload.sections),
    },
  })
}
