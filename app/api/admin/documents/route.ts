import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { Visibility } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const visibility = searchParams.get('visibility') || ''

  try {
    const where: any = {}
    if (query) {
      where.name = { contains: query, mode: 'insensitive' }
    }
    if (visibility) where.visibility = visibility

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { name: true } },
      },
    })

    return apiSuccess(documents)
  } catch (error) {
    console.error('Admin documents GET API error:', error)
    return Errors.INTERNAL('Failed to fetch documents')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const { name, fileUrl, clientId, projectId, visibility = 'INTERNAL' } = body

    if (!name || !fileUrl) {
      return Errors.VALIDATION('Document name and fileUrl are required')
    }

    const doc = await prisma.document.create({
      data: {
        name,
        fileUrl,
        clientId: clientId || null,
        projectId: projectId || null,
        visibility: visibility as Visibility,
        uploadedById: user.id,
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'document',
      entityId: doc.id,
      entityLabel: doc.name,
    })

    return apiSuccess(doc, 201)
  } catch (error) {
    console.error('Admin documents POST API error:', error)
    return Errors.INTERNAL('Failed to create document')
  }
}
