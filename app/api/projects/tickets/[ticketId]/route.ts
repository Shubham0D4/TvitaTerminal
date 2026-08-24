import { NextRequest } from 'next/server'
import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { getServerUser } from '@/lib/auth/server'
import { TicketService } from '@/lib/services/ticket.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { ticketId } = await params

  try {
    const body = await request.json()
    const ticket = await TicketService.updateTicket(ticketId, body, user)
    return apiSuccess(ticket)
  } catch (error: any) {
    console.error('PATCH ticket error:', error)
    if (error.name === 'ValidationError') {
      return Errors.VALIDATION(error.message)
    }
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to update ticket')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  const { ticketId } = await params

  try {
    const result = await TicketService.deleteTicket(ticketId, user)
    return apiSuccess(result)
  } catch (error: any) {
    console.error('DELETE ticket error:', error)
    if (error.name === 'NotFoundError') {
      return Errors.NOT_FOUND(error.message)
    }
    return Errors.INTERNAL(error.message || 'Failed to delete ticket')
  }
}
