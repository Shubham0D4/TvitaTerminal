import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { recalcProgress } from '@/lib/utils/project-progress'
import { asProcessStage } from '@/lib/process/stages'


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
    const { name, description, dueDate, assigneeId, assigneeRole, autoAssign, imageUrls, stage } = body

    if (!name) {
      return Errors.VALIDATION('Milestone name is required')
    }

    const count = await prisma.milestone.count({ where: { projectId } })

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PLANNED',
        stage: asProcessStage(stage || name),
        assigneeId: assigneeId || null,
        assigneeRole: assigneeRole || null,
        autoAssign: Boolean(autoAssign),
        createdById: user.id,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        clientVisible: false,
        sortOrder: count,
      },
    })

    await recalcProgress(projectId)
    return apiSuccess(milestone, 201)
  } catch (error) {
    console.error('Admin milestone POST API error:', error)
    return Errors.INTERNAL('Failed to create milestone')
  }
}
