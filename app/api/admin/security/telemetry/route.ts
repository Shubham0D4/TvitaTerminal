import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { SecurityDashboardService } from '@/application/services/security-dashboard.service'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: Admin access required', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const telemetry = await SecurityDashboardService.getTelemetry()
    return NextResponse.json({ success: true, data: telemetry })
  } catch (error: any) {
    console.error('Error fetching security telemetry:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
