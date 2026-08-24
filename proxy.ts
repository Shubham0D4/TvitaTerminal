import { getCookieCache, getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
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

function getPortalForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'TEAM_MEMBER':
      return '/team/dashboard'
    case 'CLIENT':
      return '/client/home'
    default:
      return '/login'
  }
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  const { isAuthenticated, cachedRole } = await resolveSession(request)

  // 1. If user is logged in and visits /login, redirect to their portal
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(
      new URL(getPortalForRole(cachedRole ?? 'ADMIN'), request.url),
    )
  }

  // 2. Allow public routes, static assets, Next.js internals
  if (
    isPublicRoute(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return response
  }

  // 3. Not authenticated → redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 4. Role is unknown while the cookie cache is cold. Let the request through:
  //    every portal layout and API route re-checks via `getServerUser()` +
  //    `requireRole()`, which read the database and remain the source of truth.
  if (!cachedRole) {
    return response
  }

  // 5. Root route redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getPortalForRole(cachedRole), request.url))
  }

  // 6. Role-based route authorization
  if (!isAuthorizedForRoute(cachedRole, pathname)) {
    return NextResponse.redirect(new URL(getPortalForRole(cachedRole), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
