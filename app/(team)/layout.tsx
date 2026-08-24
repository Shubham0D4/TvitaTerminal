import PortalLayout from '@/app/components/layout/PortalLayout'

export const dynamic = 'force-dynamic'

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout allowedRoles={['TEAM_MEMBER']}>{children}</PortalLayout>
}
