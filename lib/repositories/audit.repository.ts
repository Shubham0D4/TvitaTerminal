import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class AuditRepository {
  static async create(data: Prisma.AuditLogUncheckedCreateInput) {
    try {
      return await prisma.auditLog.create({ data })
    } catch (err) {
      console.error('[AuditRepository] Failed to write audit log:', err)
    }
  }

  static async findMany(where?: Prisma.AuditLogWhereInput, limit = 100) {
    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
