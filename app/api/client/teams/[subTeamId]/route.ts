import { PUT as handlePut, PATCH as handlePatch, DELETE as handleDelete } from '../../team/[subTeamId]/route'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ subTeamId: string }> }
) {
  return handlePut(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ subTeamId: string }> }
) {
  return handlePatch(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ subTeamId: string }> }
) {
  return handleDelete(request, context)
}
