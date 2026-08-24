import { NextResponse } from 'next/server'

import { auth, INTERNAL_EXCHANGE_CALLBACK } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

/**
 * Exchanges a legacy `profiles.magic_link_token` for a real Better Auth session.
 *
 * Invite and forgot-password flows across the app still mint their own tokens on
 * the profile row. Rather than rewrite all of those issuance sites, this route
 * validates the legacy token itself and then drives Better Auth's own magic-link
 * endpoints to mint the session — so session creation stays on public, audited
 * APIs instead of hand-signed cookies.
 */
export async function POST(request: Request) {
  try {
    const { email: rawEmail, token } = await request.json()

    if (typeof rawEmail !== 'string' || typeof token !== 'string' || !rawEmail || !token) {
      return NextResponse.json({ error: 'Email and token are required.' }, { status: 400 })
    }

    const email = rawEmail.trim().toLowerCase()

    // 1. Validate the legacy token: must match, be unexpired, and belong to an active profile.
    const profile = await prisma.profile.findFirst({
      where: {
        email,
        magicLinkToken: token,
        magicLinkExpires: { gte: new Date() },
        isActive: true,
      },
      select: { id: true, email: true },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'This link is invalid or has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    // 2. Burn the token so it cannot be replayed.
    await prisma.profile.update({
      where: { id: profile.id },
      data: { magicLinkToken: null, magicLinkExpires: null },
    })

    // 3. Mint a Better Auth magic link for this address. The sentinel callback
    //    suppresses the outbound email — we consume the token in-process below.
    await auth.api.signInMagicLink({
      body: { email: profile.email, callbackURL: INTERNAL_EXCHANGE_CALLBACK },
      headers: request.headers,
    })

    const issued = await prisma.verification.findFirst({
      where: { identifier: { contains: profile.email }, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { value: true, identifier: true },
    })

    if (!issued) {
      return NextResponse.json({ error: 'Could not establish a session.' }, { status: 500 })
    }

    // 4. Verify it to obtain a Response carrying the Set-Cookie session header.
    const verified = await auth.api.magicLinkVerify({
      query: { token: issued.value },
      headers: request.headers,
      asResponse: true,
    })

    const response = NextResponse.json({ success: true })
    for (const cookie of verified.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie)
    }
    return response
  } catch (error) {
    console.error('[magic-link/exchange] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
