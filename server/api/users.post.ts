import { z } from 'zod'
import { appUsers, type AppUser } from '../db/schema'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  displayName: z.string().trim().min(1).max(80).optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'worker']),
})

export default defineEventHandler(async (event) => {
  const { authUser, profile } = await requireAppUser(event, ['admin', 'manager'])
  const body = createUserSchema.parse(await readBody(event))

  if (profile.role === 'manager' && body.role !== 'worker') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Managers can create worker accounts only.',
    })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      role: body.role,
      display_name: body.displayName || null,
    },
  })

  if (error || !data.user) {
    throw createError({
      statusCode: 400,
      statusMessage: error?.message ?? 'Failed to create Supabase Auth user.',
    })
  }

  try {
    const db = useDb()
    const [created] = await db.insert(appUsers).values({
      authUserId: data.user.id,
      email: body.email,
      displayName: body.displayName || null,
      role: body.role as AppUser['role'],
      createdBy: authUser.id,
    }).returning()

    return {
      id: created.authUserId,
      email: created.email,
      displayName: created.displayName,
      role: created.role,
      createdAt: created.createdAt,
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(data.user.id)

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to save app user profile.',
    })
  }
})
