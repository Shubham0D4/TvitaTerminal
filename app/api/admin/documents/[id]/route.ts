import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { Visibility } from '@prisma/client'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { visibility } = body

    if (!visibility) {
      return Errors.VALIDATION('visibility is required')
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { visibility: visibility as Visibility },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin document PUT API error:', error)
    return Errors.INTERNAL('Failed to update document visibility')
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

  const { id } = await params

  try {
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return Errors.NOT_FOUND('Document')
    }

    await prisma.document.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'document',
      entityId: id,
      entityLabel: doc.name,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin document DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete document')
  }
}
