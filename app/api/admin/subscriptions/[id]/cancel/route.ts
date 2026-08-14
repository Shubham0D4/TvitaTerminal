import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id } })
    if (!subscription) {
      return Errors.NOT_FOUND('Subscription')
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'subscription',
      entityId: id,
      entityLabel: 'Subscription Cancellation',
      oldValue: { status: subscription.status },
      newValue: { status: 'CANCELLED' },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Cancel subscription API error:', error)
    return Errors.INTERNAL('Failed to cancel subscription')
  }
}
