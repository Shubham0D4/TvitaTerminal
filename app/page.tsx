import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'

export default async function RootPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  switch (user.role) {
    case 'ADMIN':
      redirect('/admin/dashboard')
    case 'TEAM_MEMBER':
      redirect('/team/dashboard')
    case 'CLIENT':
      redirect('/client/dashboard')
    default:
      redirect('/login')
  }
}
