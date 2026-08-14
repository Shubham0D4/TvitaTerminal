import { apiSuccess, Errors } from '@/lib/api-response'
import { getClientSubTeamContext, getServerUser, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return apiSuccess({
        isSubTeam: true,
        subTeam: subTeamCtx,
      })
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
      include: {
        contacts: true,
        subTeams: {
          include: { profile: { select: { email: true, name: true, isActive: true } } },
        },
      },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client profile')
    }

    return apiSuccess({
      isSubTeam: false,
      client,
    })
  } catch (error) {
    console.error('Client profile GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client profile')
  }
}

export async function PUT(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isClient(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const subTeamCtx = await getClientSubTeamContext(user.id)
    if (subTeamCtx) {
      return Errors.FORBIDDEN('Sub-team users cannot update primary client profile details')
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ profileId: user.id }, { email: user.email }] },
    })
    if (!client) return Errors.NOT_FOUND('Client profile')

    const body = await request.json()

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        legalName: body.legalName ?? client.legalName,
        displayName: body.displayName ?? client.displayName,
        contactPerson: body.contactPerson ?? client.contactPerson,
        phone: body.phone ?? client.phone,
        whatsapp: body.whatsapp ?? client.whatsapp,
        website: body.website ?? client.website,
        billingEmail: body.billingEmail ?? client.billingEmail,
        billingCity: body.billingCity ?? client.billingCity,
        billingState: body.billingState ?? client.billingState,
        billingCountry: body.billingCountry ?? client.billingCountry,
        address: body.address ?? client.address,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Client profile PUT API error:', error)
    return Errors.INTERNAL('Failed to update client profile')
  }
}
