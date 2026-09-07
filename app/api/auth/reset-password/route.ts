import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'

import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 10
const CREDENTIAL_PROVIDER_ID = 'credential'
const CREDENTIAL_ISSUER = `local:${CREDENTIAL_PROVIDER_ID}`

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Session missing or expired. Please request a new reset link.' },
        { status: 401 }
      )
    }

    const { password } = await request.json()
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 }
      )
    }

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS)
    const { email } = session.user

    // Better Auth authenticates against `accounts.password`, while parts of the
    // app (e.g. the security dashboard) still read `profiles.password_hash`.
    // Both must move together or the reset silently fails to take effect.
    await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { email },
        data: {
          passwordHash: hashedPassword,
          magicLinkToken: null,
          magicLinkExpires: null,
          invitedAt: null,
        },
        select: { id: true },
      })

      await tx.account.upsert({
        where: {
          issuer_accountId: {
            issuer: CREDENTIAL_ISSUER,
            accountId: profile.id,
          },
        },
        update: { password: hashedPassword },
        create: {
          accountId: profile.id,
          providerId: CREDENTIAL_PROVIDER_ID,
          issuer: CREDENTIAL_ISSUER,
          userId: profile.id,
          password: hashedPassword,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reset-password] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
