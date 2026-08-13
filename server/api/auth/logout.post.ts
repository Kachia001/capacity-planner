import { writeApplicationLogBestEffort } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const token = getSessionCookie(event)
  const session = token ? await readSessionToken(token) : null
  clearSessionCookie(event)
  await writeApplicationLogBestEffort({
    level: 'info',
    category: 'auth',
    event: 'logout.success',
    message: '사용자가 로그아웃했습니다.',
    actorUserId: session?.userId ?? null,
  })
  return { ok: true }
})
