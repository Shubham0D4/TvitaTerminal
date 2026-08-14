import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin, isTeamLead } from '@/lib/auth/server'
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
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return Errors.NOT_FOUND('Project')

  const isLeadOrAdmin = isAdmin(user) || project.leadId === user.id || isTeamLead(user)
  if (!isLeadOrAdmin) {
    return Errors.FORBIDDEN()
  }

  try {
    const body = await request.json()
    const { profileId, role } = body

    if (!profileId) {
      return Errors.VALIDATION('profileId is required')
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_profileId: { projectId, profileId } },
    })

    if (existingMember) {
      return Errors.CONFLICT('Member already exists in this project')
    }

    const targetProfile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!targetProfile) {
      return Errors.NOT_FOUND('Profile')
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        profileId,
        role: role || targetProfile.teamRole || 'DEVELOPER',
      },
      include: { profile: { select: { name: true, email: true, teamRole: true } } },
    })

    return apiSuccess(member, 201)
  } catch (error) {
    console.error('Team add project member API error:', error)
    return Errors.INTERNAL('Failed to add project member')
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
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return Errors.NOT_FOUND('Project')

  const isLeadOrAdmin = isAdmin(user) || project.leadId === user.id || isTeamLead(user)
  if (!isLeadOrAdmin) {
    return Errors.FORBIDDEN()
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return Errors.VALIDATION('profileId parameter is required')
  }

  try {
    await prisma.projectMember.deleteMany({
      where: { projectId, profileId },
    })

    return apiSuccess({ removed: true })
  } catch (error) {
    console.error('Team remove project member API error:', error)
    return Errors.INTERNAL('Failed to remove member')
  }
}
