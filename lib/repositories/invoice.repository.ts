import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class InvoiceRepository {
  static async findById<T extends Prisma.InvoiceInclude>(id: string, include?: T) {
    return prisma.invoice.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.InvoiceGetPayload<{ include: T }> | null>
  }

  static async findMany(params: {
    where?: Prisma.InvoiceWhereInput
    include?: Prisma.InvoiceInclude
    orderBy?: Prisma.InvoiceOrderByWithRelationInput
  }) {
    return prisma.invoice.findMany({
      where: params.where,
      include: params.include,
      orderBy: params.orderBy || { createdAt: 'desc' },
    })
  }

  static async count(where?: Prisma.InvoiceWhereInput) {
    return prisma.invoice.count({ where })
  }

  static async create(data: Prisma.InvoiceUncheckedCreateInput) {
    return prisma.invoice.create({ data })
  }

  static async update(id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    return prisma.invoice.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.invoice.delete({
      where: { id },
    })
  }

  static async findAppSettings() {
    return prisma.appSettings.findFirst()
  }
}
