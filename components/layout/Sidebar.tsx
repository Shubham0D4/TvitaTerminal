'use client'

import { useState, useEffect } from 'react'
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

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Clients', href: '/admin/clients', icon: <Building2 size={18} /> },
  { label: 'Projects', href: '/admin/projects', icon: <FolderKanban size={18} /> },
  { label: 'Members', href: '/admin/team', icon: <Users size={18} /> },
  { label: 'Billing', href: '/admin/billing', icon: <CreditCard size={18} /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
]

const TEAM_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/team/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Projects', href: '/team/projects', icon: <FolderKanban size={18} /> },
  { label: 'My Milestones', href: '/team/milestones', icon: <CheckSquare size={18} /> },
  { label: 'Profile', href: '/team/profile', icon: <UserCircle size={18} /> },
]

const CLIENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/client/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Projects', href: '/client/projects', icon: <FolderKanban size={18} /> },
  { label: 'Billing', href: '/client/invoices', icon: <CreditCard size={18} /> },
  { label: 'Profile', href: '/client/profile', icon: <UserCircle size={18} /> },
]

const NAV_BY_ROLE: Record<string, NavItem[]> = {
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
  const navItems = NAV_BY_ROLE[role] ?? []

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
      {/* Logo */}
      <div className="sidebar__logo">
        <img src="/logo.png" alt="Tvita Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        {!collapsed && <span className="sidebar__logo-name">Tvita</span>}
      </div>

      {/* Portal label */}
      {!collapsed && (
        <div className="sidebar__portal-label">{PORTAL_LABEL[role]}</div>
      )}

      {/* Nav */}
      <nav className="sidebar__nav">
        {navItems.map((item) => {
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
