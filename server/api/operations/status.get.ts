export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager', 'worker'])
  return await getOperationStatus()
})
