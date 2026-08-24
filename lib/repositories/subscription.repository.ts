import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class SubscriptionRepository {
  static async findById<T extends Prisma.SubscriptionInclude>(id: string, include?: T) {
    return prisma.subscription.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.SubscriptionGetPayload<{ include: T }> | null>
  }

  static async findMany(params: {
    where?: Prisma.SubscriptionWhereInput
    include?: Prisma.SubscriptionInclude
    orderBy?: Prisma.SubscriptionOrderByWithRelationInput
  }) {
    return prisma.subscription.findMany({
      where: params.where,
      include: params.include,
      orderBy: params.orderBy || { createdAt: 'desc' },
    })
  }

  static async create(data: Prisma.SubscriptionUncheckedCreateInput) {
    return prisma.subscription.create({ data })
  }

  static async update(id: string, data: Prisma.SubscriptionUncheckedUpdateInput) {
    return prisma.subscription.update({
      where: { id },
      data,
    })
  }

  static async updateMany(where: Prisma.SubscriptionWhereInput, data: Prisma.SubscriptionUpdateManyMutationInput) {
    return prisma.subscription.updateMany({
      where,
      data,
    })
  }

  static async delete(id: string) {
    return prisma.subscription.delete({
      where: { id },
    })
  }

  static async deleteMany(where: Prisma.SubscriptionWhereInput) {
    return prisma.subscription.deleteMany({
      where,
    })
  }

  // Plans
  static async findPlanById(id: string, include?: Prisma.PlanInclude) {
    return prisma.plan.findUnique({
      where: { id },
      include,
    })
  }

  static async findPlans(where?: Prisma.PlanWhereInput, include?: Prisma.PlanInclude) {
    return prisma.plan.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    })
  }

  static async createPlan(data: Prisma.PlanUncheckedCreateInput) {
    return prisma.plan.create({ data })
  }

  static async updatePlan(id: string, data: Prisma.PlanUncheckedUpdateInput) {
    return prisma.plan.update({
      where: { id },
      data,
    })
  }

  static async deletePlan(id: string) {
    return prisma.plan.delete({
      where: { id },
    })
  }
}
