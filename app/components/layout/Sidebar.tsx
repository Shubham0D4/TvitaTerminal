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
  ListTodo,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCircle,
  BarChart3,
  CalendarDays,
  FileText,
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
      { label: 'People', href: '/admin/team', icon: <Users size={18} /> },
      { label: 'Calendar', href: '/admin/calendar', icon: <CalendarDays size={18} /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Billing', href: '/admin/billing', icon: <CreditCard size={18} /> },
      { label: 'Quotes', href: '/admin/quotes', icon: <FileText size={18} /> },
      { label: 'Analytics', href: '/admin/finance', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> }],
  },
]

const TEAM_NAV: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { label: 'Dashboard', href: '/team/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Projects', href: '/team/projects', icon: <FolderKanban size={18} /> },
      { label: 'Tasks', href: '/team/tasks', icon: <ListTodo size={18} /> },
      { label: 'Calendar', href: '/team/calendar', icon: <CalendarDays size={18} /> },
      { label: 'My Milestones', href: '/team/milestones', icon: <CheckSquare size={18} /> },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Profile', href: '/team/profile', icon: <UserCircle size={18} /> }],
  },
]

const CLIENT_NAV: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Home', href: '/client/home', icon: <LayoutDashboard size={18} /> },
      { label: 'Projects', href: '/client/projects', icon: <FolderKanban size={18} /> },
    ],
  },
  {
    label: 'Finance',
    items: [{ label: 'Billing', href: '/client/invoices', icon: <CreditCard size={18} /> }],
  },
  {
    label: 'Account',
    items: [{ label: 'Profile', href: '/client/profile', icon: <UserCircle size={18} /> }],
  },
]

const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  ADMIN: ADMIN_NAV,
  TEAM_MEMBER: TEAM_NAV,
  CLIENT: CLIENT_NAV,
}

const PORTAL_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  TEAM_MEMBER: 'Team',
  CLIENT: 'Client',
}

interface SidebarProps {
  role: string
}

const SIDEBAR_COLLAPSE_KEY = 'tvita-sidebar-collapsed'

export default function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const navGroups = NAV_BY_ROLE[role] ?? []
  const homeHref =
    role === 'ADMIN' ? '/admin/dashboard' : role === 'TEAM_MEMBER' ? '/team/dashboard' : '/client/home'

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
    setCollapsed(stored)
    document.documentElement.style.setProperty(
      '--sidebar-current-width',
      stored ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
    )
  }, [])

  useEffect(() => {
    const width = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
    document.documentElement.style.setProperty('--sidebar-current-width', width)
  }, [collapsed])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}
      style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      <div className="sidebar__brand">
        <Link href={homeHref} className="sidebar__brand-link" title="Tvita">
          <Image src="/logo.webp" alt="Tvita" width={36} height={36} priority className="sidebar__brand-logo" />
          {!collapsed && (
            <span className="sidebar__brand-text">
              <span className="sidebar__logo-name">Tvita</span>
              <span className="sidebar__portal-badge">{PORTAL_LABEL[role]}</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="sidebar__nav-group">
            {!collapsed && group.label && (
              <div className="sidebar__section-header">{group.label}</div>
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
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar__collapse-btn"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  )
}
