import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/config/application/env'

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
      return '/client/dashboard'
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) {
      user = data.user
    }
  } catch {
    user = null
  }

  // 1. If user is logged in and visits /login, redirect to their portal
  if (user && pathname === '/login') {
    const role = (user.user_metadata?.role as string) || 'ADMIN'
    return NextResponse.redirect(new URL(getPortalForRole(role), request.url))
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
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 4. Get role from user metadata
  const role = (user.user_metadata?.role as string) || 'CLIENT'

  // 5. Root route redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getPortalForRole(role), request.url))
  }

  // 6. Role-based route authorization
  if (!isAuthorizedForRoute(role, pathname)) {
    return NextResponse.redirect(new URL(getPortalForRole(role), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
