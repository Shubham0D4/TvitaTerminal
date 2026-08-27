import { prisma } from '@/lib/prisma'

export const DEFAULT_MILESTONE_WEIGHTS: Record<string, number> = {
  'Discovery & research': 15,
  'Design': 20,
  'Quote & planning': 15,
  'Crafting the Backend': 30,
  'Testing & launch': 20,
}

export async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({ where: { projectId } })
  if (all.length === 0) {
    await prisma.project.update({ where: { id: projectId }, data: { progress: 0 } })
    return 0
  }

  let totalWeight = 0
  let completedWeight = 0

  all.forEach((m) => {
    const matchingKey = Object.keys(DEFAULT_MILESTONE_WEIGHTS).find(k => 
      m.name.toLowerCase().includes(k.toLowerCase())
    )
    const weight = matchingKey ? DEFAULT_MILESTONE_WEIGHTS[matchingKey] : 20
    
    totalWeight += weight
    if (m.status === 'COMPLETED') {
      completedWeight += weight
    }
  })

  const pct = Math.round((completedWeight / totalWeight) * 100)
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
  return pct
}
