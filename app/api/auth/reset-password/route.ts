import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Session missing or expired. Please request a new reset link.' },
        { status: 401 }
      )
    }

    const { password } = await request.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    await prisma.profile.update({
      where: { email: session.user.email },
      data: {
        passwordHash: hashedPassword,
        magicLinkToken: null,
        magicLinkExpires: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reset-password] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
