import { apiSuccess, Errors, fromUnknownError } from '@/lib/utils/api-response'
import { getServerUser, isTeamMember, isAdmin } from '@/lib/auth/server'
import { assertProjectAccess } from '@/lib/auth/access'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || (!isTeamMember(user) && !isAdmin(user))) {
    return Errors.UNAUTHORIZED()
  }

  const { id: projectId } = await params

  try {
    await assertProjectAccess(user, projectId)

    const body = await request.json()
    const { title, content } = body

    if (!title || !content) {
      return Errors.VALIDATION('Title and content are required')
    }

    const update = await prisma.projectUpdate.create({
      data: {
        projectId,
        title,
        content,
        authorId: user.id,
      },
      include: { author: { select: { name: true } } },
    })

    return apiSuccess(update, 201)
  } catch (error) {
    console.error('Create project update API error:', error)
    return fromUnknownError(error, 'Failed to create project update')
  }
}
