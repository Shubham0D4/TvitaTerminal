/**
 * Facts about routing and auth cookies that `proxy.ts` and the server-side
 * guards both depend on.
 *
 * The two authorize from different evidence: the proxy sees only cookies, while
 * layouts and pages resolve the session against the database. Where they
 * disagree a request can bounce between them forever, so the rules that keep
 * them consistent live here rather than being restated on each side.
 */

export const LOGIN_PATH = '/login'

/** Landing page per `Role`. Kept as a plain map so `proxy.ts` needs no Prisma. */
const PORTAL_BY_ROLE: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  TEAM_MEMBER: '/team/dashboard',
  CLIENT: '/client/home',
}

/**
 * Landing page for `role`, or `null` when the role is missing or unrecognised.
 *
 * Callers must read `null` as "don't redirect" rather than substituting a
 * portal: a guessed portal is one the user probably can't enter, and its guard
 * would immediately send them back.
 */
export function getPortalForRole(role: string | null | undefined): string | null {
  if (!role) return null
  return PORTAL_BY_ROLE[role] ?? null
}

/**
 * Marks a trip to the login page made because a session cookie outlived the
 * session it points at — cookies partially cleared, session row deleted, the
 * database reset, the account deactivated, `BETTER_AUTH_SECRET` rotated.
 *
 * The proxy cannot reach the database, so such a cookie still reads as "signed
 * in" and it keeps waving the request through to a portal, whose database-backed
 * guard sends it straight back here. This flag is how the guard tells the proxy
 * the cookie is dead: the proxy drops it and lets the login page render.
 */
export const STALE_SESSION_PARAM = 'stale'

/** Login URL carrying the loop-breaking flag described on `STALE_SESSION_PARAM`. */
export function staleSessionLoginUrl(from?: string): string {
  const params = new URLSearchParams({ [STALE_SESSION_PARAM]: '1' })
  if (from && from !== '/') params.set('redirect', from)
  return `${LOGIN_PATH}?${params}`
}

/**
 * Better Auth names its cookies `<prefix>.session_token`, `.session_data`,
 * `.dont_remember` and `.account_data`, where the prefix defaults to
 * `better-auth`. Each may also carry the `__Secure-` prefix, and `session_data`
 * is split into `-0`/`-1` chunks once it outgrows a single cookie — so matching
 * the shared middle covers every variant.
 */
export function isAuthCookie(name: string): boolean {
  return name.includes('better-auth')
}
