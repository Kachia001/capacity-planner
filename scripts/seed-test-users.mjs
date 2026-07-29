import { Algorithm, hash } from '@node-rs/argon2'
import postgres from 'postgres'

const databaseUrl = process.env.NUXT_DATABASE_URL
if (!databaseUrl) {
  throw new Error('NUXT_DATABASE_URL is not configured.')
}

const databaseHost = new URL(databaseUrl).hostname
if (!['127.0.0.1', 'localhost', '::1'].includes(databaseHost)) {
  throw new Error('Test accounts can only be seeded into a local PostgreSQL database.')
}

const passwordHash = await hash('123123', {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
})
const accounts = [
  {
    email: 'admin@capacity-planner.local',
    displayName: '테스트 관리자',
    role: 'admin',
  },
  {
    email: 'manager@capacity-planner.local',
    displayName: '테스트 매니저',
    role: 'manager',
  },
  {
    email: 'worker@capacity-planner.local',
    displayName: '테스트 작업자',
    role: 'worker',
  },
]
const sql = postgres(databaseUrl, { max: 1, prepare: false })

try {
  for (const account of accounts) {
    await sql`
      insert into app_users (email, password_hash, display_name, role, is_active)
      values (
        ${account.email},
        ${passwordHash},
        ${account.displayName},
        ${account.role}::app_role,
        true
      )
      on conflict (email) do update set
        password_hash = excluded.password_hash,
        display_name = excluded.display_name,
        role = excluded.role,
        is_active = true,
        auth_version = app_users.auth_version + 1,
        failed_login_count = 0,
        locked_until = null,
        updated_at = now()
    `
  }

  console.log('Seeded local test accounts: admin, manager, worker (password: 123123).')
} finally {
  await sql.end()
}
