import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import LoginForm from './LoginForm'
import { getServerUser } from '@/lib/auth/server'
import { getPortalForRole } from '@/lib/auth/routes'

/**
 * `proxy.ts` can only see that *a* session cookie exists, so it hands the login
 * page two kinds of visitor it cannot tell apart: someone genuinely signed in
 * whose cached role has expired, and someone holding a cookie whose session is
 * gone. Resolving the session against the database here separates them — the
 * first is sent on to their portal, the second gets the form.
 */
export default async function LoginPage() {
  const user = await getServerUser()
  const portal = user ? getPortalForRole(user.role) : null

  if (portal) {
    redirect(portal)
  }

  return (
    <Suspense fallback={<div className="auth-flat" />}>
      <LoginForm />
    </Suspense>
  )
}
