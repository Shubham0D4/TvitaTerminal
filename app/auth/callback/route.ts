import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/infrastructure/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cleanupExpiredInvitations } from '@/lib/invitation-cleanup'

export async function GET(request: Request) {
  // Trigger cleanup of expired invitations asynchronously
  cleanupExpiredInvitations().catch(err => console.error('[Cleanup Error]', err))

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash') || searchParams.get('token')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/reset-password'

  const supabase = await createSupabaseServerClient()
  let isSuccess = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      isSuccess = true
    } else {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    }
  } else if (token_hash) {
    const otpType: EmailOtpType = type || 'magiclink'
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    })
    if (!error) {
      isSuccess = true
    } else {
      console.error('[auth/callback] verifyOtp error:', error.message)
    }
  }

  if (isSuccess) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        const { prisma } = await import('@/lib/prisma')
        await prisma.profile.update({
          where: { email: user.email },
          data: { invitedAt: null },
        })
      }
    } catch (err) {
      console.error('[auth/callback] Failed to clear invitedAt:', err)
    }

    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const redirectUrl = isLocalEnv
      ? `${origin}${next}`
      : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`

    return NextResponse.redirect(redirectUrl)
  }

  // If no valid code/token_hash or exchange failed, redirect to login
  return NextResponse.redirect(`${origin}/login?error=Invalid%20or%20expired%20link`)
}
