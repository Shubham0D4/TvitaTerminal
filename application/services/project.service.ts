/**
 * Project & Milestone Domain Service Layer
 * Single Responsibility: Progress metrics, milestone status management, and client project access evaluations.
 */

import { prisma } from '@/lib/prisma'

export class ProjectService {
  /**
   * Fetch project details for a client account with sub-team access filtering
   */
  static async getClientProjectDetail(projectId: string, clientId: string, showMilestones = true) {
    return prisma.project.findFirst({
      where: { id: projectId, clientId },
      include: {
        lead: { select: { name: true, email: true } },
        milestones: showMilestones
          ? {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
              select: { id: true, name: true, description: true, status: true, progress: true, dueDate: true, completedDate: true },
            }
          : false,
        tasks: {
          where: { clientVisible: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        },
        updates: {
          where: { clientVisible: true },
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  /**
   * Compute project completion percentage from milestones
   */
  static async calculateProjectProgress(projectId: string): Promise<number> {
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      select: { status: true },
    })

    if (milestones.length === 0) return 0

    const completed = milestones.filter((m) => m.status === 'COMPLETED').length
    return Math.round((completed / milestones.length) * 100)
  }
}
