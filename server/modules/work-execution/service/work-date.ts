const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000

export function toSeoulDate(now: Date) {
  return new Date(now.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10)
}
