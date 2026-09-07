import { prisma } from '@/lib/prisma'
import { progressFromMilestones } from '@/lib/process/stages'

export async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({
    where: { projectId },
    select: { status: true },
  })
  const pct = progressFromMilestones(all)
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
  return pct
}
