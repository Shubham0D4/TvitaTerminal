import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class NotificationRepository {
  static async create(data: Prisma.NotificationUncheckedCreateInput) {
    try {
      return await prisma.notification.create({ data })
    } catch (err) {
      console.error('Failed to create notification:', err)
    }
  }

  static async findMany(where: Prisma.NotificationWhereInput, limit = 10) {
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    })
  }
}
