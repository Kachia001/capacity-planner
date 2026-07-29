import { Algorithm, hash } from '@node-rs/argon2'
import postgres from 'postgres'

function normalizeLoginEmail(loginId) {
  const normalized = loginId.trim().toLocaleLowerCase('en-US')
  return normalized.includes('@') ? normalized : `${normalized}@capacity-planner.local`
}

function readHiddenPassword(prompt) {
  const configuredPassword = process.env.CAPACITY_ADMIN_PASSWORD
  if (configuredPassword) {
    return Promise.resolve(configuredPassword)
  }

  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(
      new Error('Set CAPACITY_ADMIN_PASSWORD when running without an interactive terminal.'),
    )
  }

  return new Promise((resolve, reject) => {
    let password = ''

    function finish() {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      process.stdout.write('\n')
      resolve(password)
    }

    function fail(error) {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      process.stdout.write('\n')
      reject(error)
    }

    function onData(chunk) {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          fail(new Error('Cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u007f' || character === '\b') {
          if (password) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }

        password += character
        process.stdout.write('*')
      }
    }

    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
  })
}

const databaseUrl = process.env.NUXT_DATABASE_URL
if (!databaseUrl) {
  throw new Error('NUXT_DATABASE_URL is not configured.')
}

const argumentsWithoutSeparator = process.argv.slice(2).filter(argument => argument !== '--')
const loginId = argumentsWithoutSeparator[0] || 'admin'
const displayName = argumentsWithoutSeparator[1] || '시스템 관리자'
const email = normalizeLoginEmail(loginId)
const password = await readHiddenPassword(`Password for ${email}: `)

if (password.length < 8) {
  throw new Error('The password must contain at least 8 characters.')
}

const passwordHash = await hash(password, {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
})
const sql = postgres(databaseUrl, { max: 1, prepare: false })

try {
  const [created] = await sql`
    insert into app_users (email, password_hash, display_name, role)
    values (${email}, ${passwordHash}, ${displayName}, 'admin')
    on conflict (email) do nothing
    returning auth_user_id
  `

  if (!created) {
    throw new Error(`An account already exists for ${email}.`)
  }

  console.log(`Created admin account ${email} (${created.auth_user_id}).`)
} finally {
  await sql.end()
}
