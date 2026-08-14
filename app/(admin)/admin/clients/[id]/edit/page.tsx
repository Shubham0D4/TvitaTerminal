import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ClientForm from '../../ClientForm'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.client.findUnique({ where: { id }, select: { name: true } })
  return {
    title: `Edit ${c?.name ?? 'Client'} — Tvita Admin`,
    description: 'Edit client profile, billing, and legal information.',
  }
}

type PageProps = { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params

  const [client, adminProfiles] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.profile.findMany({
      where: { isActive: true, role: { in: ['ADMIN', 'TEAM_MEMBER'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!client) notFound()

  const serializedClient = JSON.parse(JSON.stringify(client))

  return (
    <div>
      <ClientForm client={serializedClient} adminProfiles={adminProfiles} />
    </div>
  )
}
