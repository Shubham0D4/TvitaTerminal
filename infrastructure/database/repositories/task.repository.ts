import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class TaskRepository {
  static async findById(id: string, include?: Prisma.TaskInclude) {
    return prisma.task.findUnique({
      where: { id },
      include,
    })
  }

  static async findMany(params: {
    where?: Prisma.TaskWhereInput
    include?: Prisma.TaskInclude
    orderBy?: Prisma.TaskOrderByWithRelationInput
  }) {
    return prisma.task.findMany({
      where: params.where,
      include: params.include,
      orderBy: params.orderBy || { createdAt: 'desc' },
    })
  }

  static async count(where?: Prisma.TaskWhereInput) {
    return prisma.task.count({ where })
  }

  static async create(data: Prisma.TaskUncheckedCreateInput) {
    return prisma.task.create({ data })
  }

  static async update(id: string, data: Prisma.TaskUncheckedUpdateInput) {
    return prisma.task.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.task.delete({
      where: { id },
    })
  }

  // Milestones
  static async findMilestoneById(id: string, include?: Prisma.MilestoneInclude) {
    return prisma.milestone.findUnique({
      where: { id },
      include,
    })
  }

  static async findMilestones(where?: Prisma.MilestoneWhereInput, include?: Prisma.MilestoneInclude) {
    return prisma.milestone.findMany({
      where,
      include,
      orderBy: { dueDate: 'asc' },
    })
  }

  static async createMilestone(data: Prisma.MilestoneUncheckedCreateInput) {
    return prisma.milestone.create({ data })
  }

  static async updateMilestone(id: string, data: Prisma.MilestoneUncheckedUpdateInput) {
    return prisma.milestone.update({
      where: { id },
      data,
    })
  }

  static async deleteMilestone(id: string) {
    return prisma.milestone.delete({
      where: { id },
    })
  }

  // Comments
  static async createComment(data: Prisma.TaskCommentUncheckedCreateInput, include?: Prisma.TaskCommentInclude) {
    return prisma.taskComment.create({ data, include })
  }

  static async findComments(where?: Prisma.TaskCommentWhereInput, include?: Prisma.TaskCommentInclude) {
    return prisma.taskComment.findMany({
      where,
      include,
      orderBy: { createdAt: 'asc' },
    })
  }

  // Activity log
  static async createActivity(data: Prisma.TaskActivityUncheckedCreateInput) {
    return prisma.taskActivity.create({ data })
  }

  static async findActivities(where?: Prisma.TaskActivityWhereInput, include?: Prisma.TaskActivityInclude) {
    return prisma.taskActivity.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    })
  }
}
