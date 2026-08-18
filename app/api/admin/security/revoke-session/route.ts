import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: Admin access required', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { sessionId, userId, revokeAllOther } = body

    await auditLog('STATUS_CHANGE', 'user', {
      entityId: userId || sessionId,
      entityLabel: revokeAllOther ? 'Revoked all other active sessions' : `Revoked session ${sessionId}`,
      oldValue: { status: 'ACTIVE_SESSION' },
      newValue: { status: 'REVOKED' },
      req,
    })

    return NextResponse.json({
      success: true,
      message: revokeAllOther ? 'All other user sessions revoked successfully' : 'Session revoked successfully',
    })
  } catch (error: any) {
    console.error('Error revoking session:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
