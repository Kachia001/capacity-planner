export type GlobalAlertVariant = 'default' | 'destructive' | 'success' | 'warning'
export type GlobalAlertDetailTone = 'default' | 'warning' | 'danger'

export interface GlobalAlertDetail {
  label: string
  value: string
  tone?: GlobalAlertDetailTone
}

export interface GlobalAlertPromptOptions {
  label: string
  placeholder?: string
  minLength?: number
  maxLength?: number
}

export interface GlobalAlertOptions {
  variant: GlobalAlertVariant
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  details?: GlobalAlertDetail[]
  acknowledgementLabel?: string
  prompt?: GlobalAlertPromptOptions
}

type AlertResolution = {
  accepted: boolean
  value: string
}

export const useGlobalAlertStore = defineStore('global-alert', () => {
  const isOpen = ref(false)
  const requestId = ref(0)
  const variant = ref<GlobalAlertVariant>('default')
  const title = ref('')
  const message = ref('')
  const confirmLabel = ref('확인')
  const cancelLabel = ref('취소')
  const details = ref<GlobalAlertDetail[]>([])
  const acknowledgementLabel = ref('')
  const promptOptions = ref<GlobalAlertPromptOptions | null>(null)

  let resolveAlert: ((resolution: AlertResolution) => void) | null = null

  function open(options: GlobalAlertOptions) {
    resolveAlert?.({ accepted: false, value: '' })

    variant.value = options.variant
    title.value = options.title ?? ''
    message.value = options.message
    confirmLabel.value = options.confirmLabel ?? '확인'
    cancelLabel.value = options.cancelLabel ?? '취소'
    details.value = options.details ?? []
    acknowledgementLabel.value = options.acknowledgementLabel ?? ''
    promptOptions.value = options.prompt ?? null
    requestId.value += 1
    isOpen.value = true

    return new Promise<AlertResolution>(resolve => {
      resolveAlert = resolve
    })
  }

  async function confirm(options: GlobalAlertOptions) {
    const resolution = await open(options)
    return resolution.accepted
  }

  async function prompt(options: GlobalAlertOptions & { prompt: GlobalAlertPromptOptions }) {
    const resolution = await open(options)
    return resolution.accepted ? resolution.value : null
  }

  function settle(accepted: boolean, value = '') {
    if (!isOpen.value) {
      return
    }

    isOpen.value = false
    resolveAlert?.({ accepted, value })
    resolveAlert = null
  }

  function accept(value = '') {
    settle(true, value)
  }

  function cancel() {
    settle(false)
  }

  return {
    isOpen,
    requestId,
    variant,
    title,
    message,
    confirmLabel,
    cancelLabel,
    details,
    acknowledgementLabel,
    promptOptions,
    confirm,
    prompt,
    accept,
    cancel,
  }
})
