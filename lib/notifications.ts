import { NotificationRepository } from '@/lib/repositories/notification.repository'

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
  return NotificationRepository.create({
    userId,
    title,
    message,
    type,
    entityType: entityType || null,
    entityId: entityId || null,
    isRead: false,
  })
}

export async function getUserNotifications(userId: string) {
  return NotificationRepository.findMany({ userId })
}

export async function markNotificationRead(id: string, userId: string) {
  return NotificationRepository.markAsRead(id, userId)
}
