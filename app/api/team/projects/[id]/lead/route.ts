import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin, isTeamLead } from '@/lib/auth/server'
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

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { leadId: true } })
  if (!project) {
    return Errors.NOT_FOUND('Project')
  }

  const isLeadOrAdmin = isAdmin(user) || isTeamLead(user) || project.leadId === user.id
  if (!isLeadOrAdmin) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return Errors.VALIDATION('leadId is required')
    }

    const leadProfile = await prisma.profile.findUnique({ where: { id: leadId } })
    if (!leadProfile) {
      return Errors.NOT_FOUND('Lead Profile')
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
    return Errors.INTERNAL('Failed to update project lead')
  }
}
