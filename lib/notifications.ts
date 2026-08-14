import { prisma } from '@/lib/prisma'

export async function createNotification({
  userId,
  title,
  message,
  type = 'INFO',
  entityType,
  entityId,
}: {
  userId: string
  title: string
  message: string
  type?: string
  entityType?: string
  entityId?: string
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        entityType: entityType || null,
        entityId: entityId || null,
        isRead: false,
      },
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  })
}
