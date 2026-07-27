import type { Clock } from '../service/ports/clock'

export class SystemClock implements Clock {
  now() {
    return new Date()
  }
}
