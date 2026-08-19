import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class ProjectRepository {
  static async findById<T extends Prisma.ProjectInclude>(id: string, include?: T) {
    return prisma.project.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.ProjectGetPayload<{ include: T }> | null>
  }

  static async findMany(params: {
    where?: Prisma.ProjectWhereInput
    include?: Prisma.ProjectInclude
    orderBy?: Prisma.ProjectOrderByWithRelationInput
  }) {
    return prisma.project.findMany({
      where: params.where,
      include: params.include,
      orderBy: params.orderBy || { createdAt: 'desc' },
    })
  }

  static async count(where?: Prisma.ProjectWhereInput) {
    return prisma.project.count({ where })
  }

  static async create(data: Prisma.ProjectUncheckedCreateInput) {
    return prisma.project.create({ data })
  }

  static async update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    })
  }

  // Members
  static async addMember(data: Prisma.ProjectMemberUncheckedCreateInput) {
    return prisma.projectMember.create({ data })
  }

  static async removeMember(projectId: string, profileId: string) {
    return prisma.projectMember.delete({
      where: {
        projectId_profileId: { projectId, profileId },
      },
    })
  }

  static async findMembers(where?: Prisma.ProjectMemberWhereInput, include?: Prisma.ProjectMemberInclude) {
    return prisma.projectMember.findMany({
      where,
      include,
    })
  }

  // Updates
  static async createUpdate(data: Prisma.ProjectUpdateUncheckedCreateInput) {
    return prisma.projectUpdate.create({ data })
  }

  static async findUpdates(where?: Prisma.ProjectUpdateWhereInput, include?: Prisma.ProjectUpdateInclude) {
    return prisma.projectUpdate.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    })
  }
}
