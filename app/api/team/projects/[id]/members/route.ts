import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { assertProjectManage } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId } = await params

  try {
    await assertProjectManage(user, projectId)

    const body = await request.json()
    const { profileId, role } = body

    if (!profileId) {
      return Errors.VALIDATION('profileId is required')
    }

    const targetProfile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!targetProfile) {
      return Errors.NOT_FOUND('Profile')
    }
    if (targetProfile.role !== 'TEAM_MEMBER' && targetProfile.role !== 'ADMIN') {
      return Errors.VALIDATION('Only agency staff can be added to a project')
    }

    const memberRole = role || targetProfile.teamRole || 'MEMBER'

    const member = await prisma.projectMember.upsert({
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

    return apiSuccess(member, 200)
  } catch (error) {
    console.error('Team add project member API error:', error)
    return fromUnknownError(error, 'Failed to add project member')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId } = await params

  try {
    await assertProjectManage(user, projectId)

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return Errors.VALIDATION('profileId parameter is required')
    }

    await prisma.projectMember.deleteMany({
      where: { projectId, profileId },
    })

    return apiSuccess({ removed: true })
  } catch (error) {
    console.error('Team remove project member API error:', error)
    return fromUnknownError(error, 'Failed to remove member')
  }
}
