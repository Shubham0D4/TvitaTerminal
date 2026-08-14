import { apiSuccess, Errors } from '@/lib/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { BillingCycle } from '@prisma/client'
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
    const existing = await prisma.plan.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Plan')
    }

    const body = await request.json()
    const { name, description, price, billingCycle, currency, isActive, clientId, features } = body

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        price: price !== undefined ? Number(price) : existing.price,
        billingCycle: billingCycle ? (billingCycle as BillingCycle) : existing.billingCycle,
        currency: currency ?? existing.currency,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        clientId: clientId !== undefined ? clientId : existing.clientId,
        isPrivate: clientId !== undefined ? Boolean(clientId) : existing.isPrivate,
      },
    })

    if (Array.isArray(features)) {
      await prisma.planFeature.deleteMany({ where: { planId: id } })
      if (features.length > 0) {
        await prisma.planFeature.createMany({
          data: features.map((feature: string) => ({
            planId: id,
            name: feature,
          })),
        })
      }
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'plan',
      entityId: id,
      entityLabel: existing.name,
      oldValue: { price: existing.price, isActive: existing.isActive },
      newValue: { price: updated.price, isActive: updated.isActive },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin plan PUT API error:', error)
    return Errors.INTERNAL('Failed to update subscription plan')
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
    const plan = await prisma.plan.findUnique({ where: { id } })
    if (!plan) {
      return Errors.NOT_FOUND('Plan')
    }

    await prisma.plan.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'plan',
      entityId: id,
      entityLabel: plan.name,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin plan DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete subscription plan')
  }
}
