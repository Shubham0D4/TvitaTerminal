import { apiSuccess, Errors } from '@/lib/api-response'
import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET() {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return apiSuccess({ notifications, unreadCount })
  } catch (error) {
    console.error('GET notifications error:', error)
    return Errors.INTERNAL('Failed to load notifications')
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return Errors.UNAUTHORIZED()

  try {
    const body = await request.json().catch(() => ({}))
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    } else if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true },
      })
    }

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('PATCH notifications error:', error)
    return Errors.INTERNAL('Failed to update notifications')
  }
}
