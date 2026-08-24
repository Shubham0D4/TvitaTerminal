import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: {
        projectMembers: { include: { project: { select: { name: true } } } },
        tasksAssigned: { select: { id: true, status: true, title: true } },
      },
    })

    if (!profile) {
      return Errors.NOT_FOUND('Profile')
    }

    return apiSuccess(profile)
  } catch (error) {
    console.error('Team profile GET API error:', error)
    return Errors.INTERNAL('Failed to fetch user profile')
  }
}

export async function PUT(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { name, phone } = body

    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: {
        name: name || undefined,
        phone: phone !== undefined ? phone : undefined,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Team profile PUT API error:', error)
    return Errors.INTERNAL('Failed to update profile')
  }
}
