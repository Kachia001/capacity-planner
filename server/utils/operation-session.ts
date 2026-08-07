const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000

export function getSeoulOperationDate(timestamp: Date) {
  return new Date(timestamp.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10)
}

export function createOperationSessionId(openedAt: Date) {
  const datePart = getSeoulOperationDate(openedAt).replaceAll('-', '')
  return `${datePart}-${crypto.randomUUID()}`
}

export function getRegularCloseForOperationDate(operationDate: string) {
  return new Date(`${operationDate}T17:20:00+09:00`)
}
