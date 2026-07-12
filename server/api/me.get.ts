export default defineEventHandler(async (event) => {
  const { authUser, profile } = await requireAppUser(event)

  return {
    id: profile.authUserId,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    authEmail: authUser.email,
  }
})
