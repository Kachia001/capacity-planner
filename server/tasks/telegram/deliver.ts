import { processTelegramOutbox } from '#server/utils/telegram-outbox'

export default defineTask({
  meta: {
    name: 'telegram:deliver',
    description: 'Deliver pending Telegram issue notifications.',
  },
  async run() {
    return {
      result: await processTelegramOutbox({ limit: 20 }),
    }
  },
})
