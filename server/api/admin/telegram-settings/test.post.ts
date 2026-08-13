import { sendConfiguredTelegramMessage } from '#server/utils/telegram'
import { writeApplicationLogBestEffort } from '#server/utils/application-log'

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
    await writeApplicationLogBestEffort({
      level: 'info',
      category: 'telegram',
      event: 'telegram.test_sent',
      message: '관리자가 Telegram 연동 테스트 메시지를 전송했습니다.',
      actorUserId: profile.authUserId,
      metadata: { telegramMessageId: result.messageId },
    })
    return result
  }

  await writeApplicationLogBestEffort({
    level: result.status === 'failed' ? 'error' : 'warn',
    category: 'telegram',
    event: result.status === 'failed' ? 'telegram.test_failed' : 'telegram.test_skipped',
    message:
      result.status === 'failed'
        ? '관리자가 요청한 Telegram 연동 테스트 메시지 전송에 실패했습니다.'
        : 'Telegram 설정 상태로 인해 연동 테스트 메시지 전송을 건너뛰었습니다.',
    actorUserId: profile.authUserId,
    metadata: {
      reason: result.status === 'failed' ? result.code : result.reason,
    },
  })

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
