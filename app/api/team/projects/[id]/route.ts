import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        lead: { select: { id: true, name: true, email: true, teamRole: true } },
        members: { include: { profile: { select: { id: true, name: true, email: true, teamRole: true } } } },
        milestones: {
          orderBy: { sortOrder: 'asc' },
          include: { assignee: { select: { id: true, name: true } } },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            developer: { select: { id: true, name: true } },
            tester: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        },
      },
    })

    if (!project) {
      return Errors.NOT_FOUND('Project')
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('Team project GET API error:', error)
    return Errors.INTERNAL('Failed to fetch project detail')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    return Errors.NOT_FOUND('Project')
  }

  try {
    const body = await request.json()
    const { projectLeadId, name, description, status } = body

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(projectLeadId !== undefined ? { leadId: projectLeadId || null } : {}),
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
      },
    })

    if (projectLeadId) {
      await prisma.projectMember.upsert({
        where: { projectId_profileId: { projectId: id, profileId: projectLeadId } },
        create: { projectId: id, profileId: projectLeadId, role: 'TEAM_LEAD' },
        update: { role: 'TEAM_LEAD' },
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Team project PUT API error:', error)
    return Errors.INTERNAL('Failed to update project')
  }
}
