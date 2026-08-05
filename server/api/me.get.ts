export default defineEventHandler(async event => {
  const profile = await requireSessionUser(event)

  return {
    id: profile.authUserId,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    authEmail: profile.email,
    mustChangePassword: profile.mustChangePassword,
  }
})
