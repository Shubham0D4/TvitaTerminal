import { prisma } from '@/lib/prisma'
import PlanForm from './PlanForm'

export const metadata = {
  title: 'Create Plan — Tvita Admin',
  description: 'Build a new retainer or subscription plan. Can be public or client-exclusive.',
}

export default async function NewPlanPage() {
  const clients = await prisma.client.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <PlanForm clients={clients} />
    </div>
  )
}
