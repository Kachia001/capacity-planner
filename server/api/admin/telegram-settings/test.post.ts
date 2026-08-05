import { sendConfiguredTelegramMessage } from '#server/utils/telegram'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const actor = profile.displayName?.trim() || profile.email
  const result = await sendConfiguredTelegramMessage(
    [
      '✅ Capacity Planner Telegram 연동 테스트',
      '',
      `요청자: ${actor}`,
      `시각: ${new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date())}`,
      '',
      '이 메시지가 보이면 작업 이슈 알림 설정이 정상입니다.',
    ].join('\n'),
  )

  if (result.status === 'sent') {
    return result
  }

  throw createError({
    statusCode: result.status === 'skipped' ? 409 : 502,
    message:
      result.status === 'skipped'
        ? result.reason === 'disabled'
          ? 'Telegram 알림이 비활성화되어 있습니다.'
          : 'Telegram 설정이 아직 저장되지 않았습니다.'
        : result.message,
  })
})
