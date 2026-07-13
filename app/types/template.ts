export type TemplateGroupKind = 'work' | 'material'

export type TemplateMode = 'existing' | 'new'
export type TemplateSource = 'blank' | 'clone'
export type DraftSaveState = 'idle' | 'saving' | 'saved'

export interface BayWizardStep {
  number: number
  eyebrow: string
  label: string
  description: string
}

export type TemplateItemDraft = {
  clientId: string
  sortOrder: number
  legacySourceRow: number | null
  workDetail: string
  vendor: string
  partNo: string
  itemName: string
  bolt: string
  isHighAltitude: boolean
  safetyNote: string
}

export type TemplateGroupDraft = {
  clientId: string
  sortOrder: number
  kind: TemplateGroupKind
  workNo: number | null
  workName: string
  items: TemplateItemDraft[]
}

export type ExistingTemplateDraft = {
  id: string
  name: string
  description: string
  sourceBay: string
  updatedAtLabel: string
  usedByBayCount: number
  groups: TemplateGroupDraft[]
}

export type BayDraftPayload = {
  bay: {
    code: string
    description: string
  }
  groups: TemplateGroupDraft[]
}
