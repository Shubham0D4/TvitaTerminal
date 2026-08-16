import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser } from '@/lib/auth/server'
import { TicketService } from '@/application/services/ticket.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const tickets = await TicketService.getTicketsList(id, user)
    return apiSuccess(tickets)
  } catch (error: any) {
    console.error('GET tickets error:', error)
    return Errors.INTERNAL(error.message || 'Failed to fetch tickets')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { id } = await params

  try {
    const body = await request.json()
    const ticket = await TicketService.createTicket({ ...body, projectId: id }, user)
    return apiSuccess(ticket, 201)
  } catch (error: any) {
    console.error('POST ticket error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to create ticket')
  }
}
