import { getCookieCache, getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

import {
  LOGIN_PATH,
  STALE_SESSION_PARAM,
  getPortalForRole,
  isAuthCookie,
  staleSessionLoginUrl,
} from '@/lib/auth/routes'

const PUBLIC_ROUTES = [
  LOGIN_PATH,
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/auth',
  '/api/stripe/webhook',
  '/api/integrations',
]

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/admin', '/api/admin'],
  TEAM_MEMBER: ['/team', '/api/team'],
  CLIENT: ['/client', '/api/client'],
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

function isAuthorizedForRoute(role: string, pathname: string): boolean {
  if (pathname.startsWith('/print/')) {
    return true
  }
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/team') &&
    !pathname.startsWith('/api/client')
  ) {
    return true
  }
  const allowedPrefixes = ROLE_ROUTES[role] || []
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Resolves the caller's identity without touching the database.
 *
 * `cachedRole` is populated from Better Auth's signed session-cookie cache. That
 * cache is short-lived, so an authenticated user can legitimately present a
 * session cookie with no cached role — callers must treat `null` as "unknown",
 * not "unauthorized".
 *
 * `isAuthenticated` likewise means "carries a session cookie", not "has a live
 * session": only the database can settle that. See `STALE_SESSION_PARAM`.
 */
async function resolveSession(
  request: NextRequest,
): Promise<{ isAuthenticated: boolean; cachedRole: string | null }> {
  const hasSessionCookie = getSessionCookie(request) !== null

  try {
    const cached = await getCookieCache(request, {
      secret: process.env.BETTER_AUTH_SECRET,
    })
    const role = (cached?.user as { role?: string } | undefined)?.role ?? null
    return { isAuthenticated: hasSessionCookie || cached !== null, cachedRole: role }
  } catch (err) {
    console.error('[Middleware] session cache read failed:', err)
    return { isAuthenticated: hasSessionCookie, cachedRole: null }
  }
}

/**
 * Expires every Better Auth cookie the request carried, so the next request
 * arrives clean instead of re-triggering the same dead-session bounce.
 */
function clearAuthCookies(request: NextRequest, response: NextResponse): NextResponse {
  for (const cookie of request.cookies.getAll()) {
    if (!isAuthCookie(cookie.name)) continue
    response.cookies.set(cookie.name, '', {
      path: '/',
      maxAge: 0,
      // A `__Secure-`-prefixed cookie is only deletable by a Secure Set-Cookie.
      secure: cookie.name.startsWith('__Secure-'),
    })
  }
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const response = NextResponse.next({ request })

  const { isAuthenticated, cachedRole } = await resolveSession(request)

  // 1. A portal guard has just rejected this session against the database, so
  //    the cookie is dead however convincing it looks from here. Bin it and let
  //    the login page render. Without this the next rule would send the request
  //    back to the portal, whose guard would send it back here — forever.
  if (pathname === LOGIN_PATH && searchParams.has(STALE_SESSION_PARAM)) {
    return clearAuthCookies(request, response)
  }

  // 2. Signed in and asking for the login page → straight on to their portal.
  //    Only when the cached role names one: guessing a portal drops the user
  //    somewhere they may not be allowed, and that guard bounces them back here.
  //    With the role unknown, the login page resolves the session itself.
  if (isAuthenticated && pathname === LOGIN_PATH) {
    const portal = getPortalForRole(cachedRole)
    return portal ? NextResponse.redirect(new URL(portal, request.url)) : response
  }

  // 3. Allow public routes, static assets, Next.js internals
  if (
    isPublicRoute(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return response
  }

  // 4. Not authenticated → redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 5. Role is unknown while the cookie cache is cold. Let the request through:
  //    every portal layout and API route re-checks via `getServerUser()` +
  //    `requireRole()`, which read the database and remain the source of truth.
  if (!cachedRole) {
    return response
  }

  const portal = getPortalForRole(cachedRole)

  // 6. Root route redirect. An unmapped role is left to the root page, which
  //    resolves the real session rather than guessing from the cookie.
  if (pathname === '/') {
    return portal ? NextResponse.redirect(new URL(portal, request.url)) : response
  }

  // 7. Role-based route authorization. A role with no portal to fall back on is
  //    a session we cannot place, so it is retired rather than redirected.
  if (!isAuthorizedForRoute(cachedRole, pathname)) {
    return NextResponse.redirect(new URL(portal ?? staleSessionLoginUrl(), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
