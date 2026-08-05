import { hash, verify } from '@node-rs/argon2'
import { randomInt } from 'node:crypto'

const PASSWORD_HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const

export function normalizeLoginEmail(loginId: string) {
  const normalized = loginId.trim().toLocaleLowerCase('en-US')
  return normalized.includes('@') ? normalized : `${normalized}@capacity-planner.local`
}

export function hashPassword(password: string) {
  return hash(password, PASSWORD_HASH_OPTIONS)
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password)
}

const TEMPORARY_PASSWORD_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%*+-_',
] as const
const TEMPORARY_PASSWORD_ALPHABET = TEMPORARY_PASSWORD_GROUPS.join('')

function randomCharacter(characters: string) {
  return characters[randomInt(characters.length)] as string
}

export function generateTemporaryPassword(length = 14) {
  if (length < TEMPORARY_PASSWORD_GROUPS.length) {
    throw new Error('Temporary password length is too short.')
  }

  const characters = TEMPORARY_PASSWORD_GROUPS.map(randomCharacter)
  while (characters.length < length) {
    characters.push(randomCharacter(TEMPORARY_PASSWORD_ALPHABET))
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex]!, characters[index]!]
  }

  return characters.join('')
}
