import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/infrastructure/email'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const profile = await prisma.profile.findUnique({
      where: { email: cleanEmail },
    })

    // For security reasons, do not leak whether the email exists. Always return success.
    if (profile && profile.isActive) {
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

      await prisma.profile.update({
        where: { id: profile.id },
        data: {
          magicLinkToken: token,
          magicLinkExpires: expires,
        },
      })

      // Get app base URL
      const origin = new URL(request.url).origin
      const resetLink = `${origin}/auth/callback?token=${token}&email=${encodeURIComponent(cleanEmail)}&next=/reset-password`

      await sendPasswordResetEmail({
        to: cleanEmail,
        name: profile.name,
        resetLink,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[forgot-password] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
