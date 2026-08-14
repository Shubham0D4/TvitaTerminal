import PortalLayout from '@/components/layout/PortalLayout'

export const dynamic = 'force-dynamic'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout allowedRoles={['CLIENT']}>{children}</PortalLayout>
}
