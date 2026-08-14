import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id: approvalId } = await params

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx && !subTeamCtx.policy.approvals) {
      return Errors.FORBIDDEN('Approval access is restricted by policy')
    }

    const approval = await prisma.clientApproval.findUnique({
      where: { id: approvalId },
      include: { client: true },
    })

    if (!approval) {
      return Errors.NOT_FOUND('Approval request')
    }

    const client = await prisma.client.findFirst({
      where: subTeamCtx
        ? { id: subTeamCtx.clientId }
        : { OR: [{ profileId: user.id }, { email: user.email }] },
    })

    if (!client || approval.clientId !== client.id) {
      return Errors.FORBIDDEN()
    }

    const body = await request.json()
    const { status, clientNote } = body

    if (!status || !['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return Errors.VALIDATION('Valid response status (APPROVED, REJECTED, REVISION_REQUESTED) is required')
    }

    const updated = await prisma.clientApproval.update({
      where: { id: approvalId },
      data: {
        status,
        clientNote: clientNote || null,
        respondedAt: new Date(),
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Client approval respond API error:', error)
    return Errors.INTERNAL('Failed to submit approval response')
  }
}
