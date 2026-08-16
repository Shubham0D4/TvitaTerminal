import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export class ClientRepository {
  static async findClientForActor(params: { userId: string; email: string; subTeamClientId?: string }) {
    if (params.subTeamClientId) {
      return prisma.client.findUnique({
        where: { id: params.subTeamClientId },
      })
    }
    return prisma.client.findFirst({
      where: {
        OR: [
          { profileId: params.userId },
          { email: params.email },
        ],
      },
    })
  }

  static async findClientById(id: string, include?: Prisma.ClientInclude) {
    return prisma.client.findUnique({
      where: { id },
      include,
    })
  }

  static async findClientByEmail(email: string) {
    return prisma.client.findFirst({
      where: { email },
    })
  }

  static async updateClient(id: string, data: Prisma.ClientUncheckedUpdateInput) {
    return prisma.client.update({
      where: { id },
      data,
    })
  }

  static async findSubTeamById(id: string, include?: Prisma.ClientSubTeamInclude) {
    return prisma.clientSubTeam.findUnique({
      where: { id },
      include,
    })
  }

  static async findSubTeams(where: Prisma.ClientSubTeamWhereInput, include?: Prisma.ClientSubTeamInclude) {
    return prisma.clientSubTeam.findMany({
      where,
      include,
    })
  }

  static async findSubTeamMemberById(id: string, include?: Prisma.ClientSubTeamMemberInclude) {
    return prisma.clientSubTeamMember.findUnique({
      where: { id },
      include,
    })
  }

  static async findSubTeamMembers(where: Prisma.ClientSubTeamMemberWhereInput, include?: Prisma.ClientSubTeamMemberInclude) {
    return prisma.clientSubTeamMember.findMany({
      where,
      include,
    })
  }
}
