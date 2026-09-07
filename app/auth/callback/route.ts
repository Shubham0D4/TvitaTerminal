import { NextResponse } from 'next/server'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'
import { isSafeInternalPath } from '@/lib/auth/routes'

export async function GET(request: Request) {
  cleanupExpiredInvitations().catch(err => console.error('[Cleanup Error]', err))

  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const next = isSafeInternalPath(searchParams.get('next'), '/reset-password')

  if (token && email) {
    return NextResponse.redirect(
      `${origin}/login/verify?token=${token}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
    )
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid%20or%20expired%20link`)
}
