import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { assertProjectManage } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PUT(
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
    const { leadId } = body

    if (!leadId) {
      return Errors.VALIDATION('leadId is required')
    }

    const leadProfile = await prisma.profile.findUnique({ where: { id: leadId } })
    if (!leadProfile) {
      return Errors.NOT_FOUND('Lead Profile')
    }
    if (leadProfile.role !== 'TEAM_MEMBER' && leadProfile.role !== 'ADMIN') {
      return Errors.VALIDATION('Lead must be an agency staff member')
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { leadId },
    })

    const memberExists = await prisma.projectMember.findUnique({
      where: { projectId_profileId: { projectId, profileId: leadId } },
    })

    if (!memberExists) {
      await prisma.projectMember.create({
        data: {
          projectId,
          profileId: leadId,
          role: 'TEAM_LEAD',
        },
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Update project lead API error:', error)
    return fromUnknownError(error, 'Failed to update project lead')
  }
}
