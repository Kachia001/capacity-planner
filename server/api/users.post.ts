import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers, type AppUser } from '../db/schema'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  displayName: z.string().trim().min(1).max(80).optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'worker']),
})

export default defineEventHandler(async event => {
  const { authUser, profile } = await requireAppUser(event, ['admin', 'manager'])
  const body = createUserSchema.parse(await readBody(event))

  if (profile.role === 'manager' && body.role !== 'worker') {
    throw createError({
      statusCode: 403,
      statusMessage: '매니저는 작업자만 생성 할 수 있습니다.',
    })
  }
  if (body.role === 'admin') {
    throw createError({
      statusCode: 400,
      statusMessage: '어드민은 생성할 수 없습니다.',
    })
  }

  const db = useDb()
  const email = normalizeLoginEmail(body.email)
  const [existing] = await db
    .select({ id: appUsers.authUserId })
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: '이미 등록된 로그인 ID입니다.',
    })
  }

  const passwordHash = await hashPassword(body.password)
  const [created] = await db
    .insert(appUsers)
    .values({
      email,
      passwordHash,
      displayName: body.displayName || null,
      role: body.role as AppUser['role'],
      createdBy: authUser.id,
    })
    .returning()

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create the app user.',
    })
  }

  return {
    id: created.authUserId,
    email: created.email,
    displayName: created.displayName,
    role: created.role,
    createdAt: created.createdAt,
  }
})
