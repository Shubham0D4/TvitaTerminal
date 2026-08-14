import PortalLayout from '@/components/layout/PortalLayout'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout allowedRoles={['ADMIN']}>{children}</PortalLayout>
}
