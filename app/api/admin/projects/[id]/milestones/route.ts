import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({ where: { projectId } })
  const done = all.filter((m) => m.status === 'COMPLETED').length
  const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
}

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
    const { name, description, dueDate, assigneeId, assigneeRole, autoAssign, imageUrls } = body

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
