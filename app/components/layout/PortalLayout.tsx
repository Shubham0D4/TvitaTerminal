import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import Sidebar from '@/app/components/layout/Sidebar'
import Topbar from '@/app/components/layout/Topbar'
import { Toaster } from 'react-hot-toast'
import type { Role } from '@prisma/client'

interface PortalLayoutProps {
  children: React.ReactNode
  allowedRoles: Role[]
}

import ClientNavbar from '@/app/components/layout/ClientNavbar'

export default async function PortalLayout({ children, allowedRoles }: PortalLayoutProps) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their correct portal
    switch (user.role) {
      case 'ADMIN':
        redirect('/admin/dashboard')
        break
      case 'TEAM_MEMBER':
        redirect('/team/dashboard')
        break
      case 'CLIENT':
        redirect('/client/home')
        break
      default:
        redirect('/login')
    }
  }

  const toastElement = (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-overlay)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          fontSize: 'var(--text-sm)',
          borderRadius: 'var(--radius-lg)',
        },
        success: {
          iconTheme: { primary: 'var(--color-success)', secondary: 'transparent' },
        },
        error: {
          iconTheme: { primary: 'var(--color-danger)', secondary: 'transparent' },
        },
      }}
    />
  )

  // Dedicated top navbar layout for CLIENT portal (No sidebar)
  if (user.role === 'CLIENT') {
    const { getClientSubTeamContext } = await import('@/lib/auth/server')
    const subTeamCtx = await getClientSubTeamContext(user.id)
    return (
      <div className="client-portal-root">
        <ClientNavbar
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
          }}
          subTeamCtx={subTeamCtx}
        />
        <main className="client-portal-content">
          {children}
        </main>
        {toastElement}
      </div>
    )
  }

  // Sidebar + Topbar layout for ADMIN and TEAM portals
  return (
    <div className="portal-root">
      <Sidebar role={user.role} />
      <div className="portal-main">
        <Topbar
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        />
        <main className="portal-content">
          {children}
        </main>
      </div>
      {toastElement}
    </div>
  )
}
