import { prisma } from '@/lib/prisma'
import ClientForm from '../ClientForm'

export const metadata = {
  title: 'Add Client — Tvita Admin',
  description: 'Create a new international or domestic client profile.',
}

export default async function NewClientPage() {
  const adminProfiles = await prisma.profile.findMany({
    where: { isActive: true, role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <ClientForm adminProfiles={adminProfiles} />
    </div>
  )
}
