import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId } = await params

  try {
    const body = await request.json()
    const { profileId, role } = body

    if (!profileId) {
      return Errors.VALIDATION('profileId is required')
    }

    const targetProfile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!targetProfile) {
      return Errors.NOT_FOUND('Profile')
    }

    const memberRole = role || targetProfile.teamRole || 'DEVELOPER'

    const newMember = await prisma.projectMember.upsert({
      where: { projectId_profileId: { projectId, profileId } },
      create: {
        projectId,
        profileId,
        role: memberRole,
      },
      update: {
        role: memberRole,
      },
      include: { profile: { select: { name: true, email: true, teamRole: true } } },
    })

    return apiSuccess(newMember, 200)
  } catch (error) {
    console.error('Admin add project member API error:', error)
    return Errors.INTERNAL('Failed to add project member')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return Errors.VALIDATION('profileId query parameter is required')
  }

  try {
    await prisma.projectMember.deleteMany({
      where: { projectId, profileId },
    })

    return apiSuccess({ removed: true })
  } catch (error) {
    console.error('Admin remove project member API error:', error)
    return Errors.INTERNAL('Failed to remove project member')
  }
}
