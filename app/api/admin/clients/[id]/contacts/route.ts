import { apiSuccess, Errors } from '@/lib/utils/api-response'
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

  const { id: clientId } = await params

  try {
    const body = await request.json()
    if (!body.name) {
      return Errors.VALIDATION('Contact name is required')
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        name: String(body.name).trim(),
        role: body.role || null,
        designation: body.designation || null,
        email: body.email || null,
        phone: body.phone || null,
        isDecisionMaker: Boolean(body.isDecisionMaker),
      },
    })

    return apiSuccess(contact, 201)
  } catch (error) {
    console.error('Admin add contact API error:', error)
    return Errors.INTERNAL('Failed to add contact')
  }
}
