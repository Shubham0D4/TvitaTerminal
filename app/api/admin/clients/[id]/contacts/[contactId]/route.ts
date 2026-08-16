import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { contactId } = await params

  try {
    await prisma.clientContact.delete({
      where: { id: contactId },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin delete contact API error:', error)
    return Errors.INTERNAL('Failed to delete contact')
  }
}
