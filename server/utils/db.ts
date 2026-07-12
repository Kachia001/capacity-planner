import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

let client: postgres.Sql | undefined

export function useDb() {
  const { databaseUrl } = useRuntimeConfig()

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_DATABASE_URL is not configured.',
    })
  }

  client ??= postgres(databaseUrl, {
    max: 5,
    prepare: false,
  })

  return drizzle(client, { schema })
}
