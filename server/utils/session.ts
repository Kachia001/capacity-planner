import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { jwtVerify, SignJWT } from 'jose'

const SESSION_COOKIE_NAME = 'capacity_planner_session'
const SESSION_ISSUER = 'capacity-planner'
const SESSION_AUDIENCE = 'capacity-planner-web'
const SESSION_TTL_SECONDS = 60 * 60 * 12

export type SessionClaims = {
  userId: string
  authVersion: number
}

function getSessionSecret() {
  const secret = useRuntimeConfig().authSessionSecret

  if (typeof secret !== 'string' || secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_AUTH_SESSION_SECRET must be at least 32 characters.',
    })
  }

  return new TextEncoder().encode(secret)
}

export async function createSessionToken(claims: SessionClaims) {
  return await new SignJWT({ authVersion: claims.authVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret())
}

export async function readSessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ['HS256'],
    })

    if (!payload.sub || typeof payload.authVersion !== 'number') {
      return null
    }

    return {
      userId: payload.sub,
      authVersion: payload.authVersion,
    }
  } catch {
    return null
  }
}

export function getSessionCookie(event: H3Event) {
  return getCookie(event, SESSION_COOKIE_NAME)
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}
