'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCircle,
  ScrollText,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Clients', href: '/admin/clients', icon: <Building2 size={18} /> },
      { label: 'Projects', href: '/admin/projects', icon: <FolderKanban size={18} /> },
      { label: 'Members', href: '/admin/team', icon: <Users size={18} /> },
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Billing', href: '/admin/billing', icon: <CreditCard size={18} /> },
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
    ]
  }
]

const TEAM_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/team/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Projects', href: '/team/projects', icon: <FolderKanban size={18} /> },
      { label: 'My Milestones', href: '/team/milestones', icon: <CheckSquare size={18} /> },
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/team/profile', icon: <UserCircle size={18} /> },
    ]
  }
]

const CLIENT_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Home', href: '/client/home', icon: <LayoutDashboard size={18} /> },
      { label: 'Projects', href: '/client/projects', icon: <FolderKanban size={18} /> },
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Billing', href: '/client/invoices', icon: <CreditCard size={18} /> },
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/client/profile', icon: <UserCircle size={18} /> },
    ]
  }
]

const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  ADMIN: ADMIN_NAV,
  TEAM_MEMBER: TEAM_NAV,
  CLIENT: CLIENT_NAV,
}

const PORTAL_LABEL: Record<string, string> = {
  ADMIN: 'Admin Portal',
  TEAM_MEMBER: 'Team Portal',
  CLIENT: 'Client Portal',
}

interface SidebarProps {
  role: string
}

export default function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const navGroups = NAV_BY_ROLE[role] ?? []

  // Keep a CSS variable in sync so portal-main can adjust margin-left
  useEffect(() => {
    const width = collapsed
      ? 'var(--sidebar-collapsed-width)'
      : 'var(--sidebar-width)'
    document.documentElement.style.setProperty('--sidebar-current-width', width)
  }, [collapsed])

  return (
    <aside
      className="sidebar"
      style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Logo and Brand */}
      <div 
        className="sidebar__logo" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          justifyContent: 'center', 
          height: '76px', 
          borderBottom: '1px solid rgba(255,255,255,0.06)', 
          padding: '0 var(--space-5)', 
          gap: '2px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar__logo-mark" style={{ width: '28px', height: '28px', fontSize: '13px', background: 'var(--accent-gradient)' }}>T</div>
          {!collapsed && <span className="sidebar__logo-name" style={{ fontSize: '1.25rem' }}>Tvita</span>}
        </div>
        {!collapsed && (
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginLeft: '38px' }}>
            {PORTAL_LABEL[role]}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="sidebar__nav-group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {!collapsed && group.label && (
              <div 
                style={{ 
                  padding: 'var(--space-2) var(--space-4) var(--space-1)', 
                  fontSize: '9px', 
                  fontWeight: 700, 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em' 
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
                  {isActive && !collapsed && <span className="sidebar__nav-indicator" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        className="sidebar__collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  )
}
