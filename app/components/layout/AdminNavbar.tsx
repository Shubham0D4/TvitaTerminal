'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  House,
  Building2,
  Folder,
  Receipt,
  Users,
  Settings,
  Bell,
  Menu,
  X,
} from 'lucide-react'

interface AdminNavbarProps {
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }
}

export default function AdminNavbar({ user }: AdminNavbarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Focused workspaces: back on the left, logo centred, no menu.
  const clientDetail = /^\/admin\/clients\/[^/]+/.test(pathname)
  const projectDetail = /^\/admin\/projects\/[^/]+/.test(pathname)
  const billingDetail = /^\/admin\/billing\/[^/]+/.test(pathname)
  const focusMode = clientDetail || projectDetail || billingDetail

  // Back lands where the user came from.
  const backHref = clientDetail
    ? '/admin/clients'
    : projectDetail
      ? '/admin/projects'
      : billingDetail
        ? '/admin/billing'
        : '/admin/dashboard'

  const [collapsed, setCollapsed] = useState(false)

  // Derived during render — setting it in the effect below would cascade renders.
  if (!focusMode && collapsed) setCollapsed(false)

  // One frame after landing, so the menu is painted in place first and is then seen sliding away.
  useEffect(() => {
    if (!focusMode) return
    const frame = requestAnimationFrame(() => setCollapsed(true))
    return () => cancelAnimationFrame(frame)
  }, [focusMode])

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <House size={17} /> },
    { label: 'Clients', href: '/admin/clients', icon: <Building2 size={17} /> },
    { label: 'Projects', href: '/admin/projects', icon: <Folder size={17} /> },
    { label: 'Billing', href: '/admin/billing', icon: <Receipt size={17} /> },
    { label: 'Team', href: '/admin/team', icon: <Users size={17} /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={17} /> },
  ]

  useEffect(() => {
    let active = true
    async function loadNotifs() {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/notifications').then((r) => r.json())
        if (!active) return
        if (res?.data) {
          setUnreadCount(res.data.unreadCount || 0)
        }
      } catch {
        // quiet
      }
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 45000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifs()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <header className="client-navbar">
      <div className={`client-navbar__container${focusMode ? ' is-focus' : ''}`}>
        {focusMode && (
          <Link
            href={backHref}
            className={`client-navbar__back${collapsed ? ' is-visible' : ''}`}
            aria-label="Back"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
        )}

        {/* Left: Brand Logo & Admin Portal Label */}
        <div className={`client-navbar__brand${focusMode ? ' is-centred' : ''}`}>
          <Link href="/admin/dashboard" className="client-navbar__logo-link">
            <Image src="/logo.webp" alt="Tvita" width={48} height={48} priority />
            <span className="sidebar__logo-name" style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              Tvita
              <sub style={{ fontSize: '0.55em', marginLeft: '2px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'lowercase', bottom: '-0.2em' }}>
                admin
              </sub>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav
          className={`client-navbar__nav${collapsed ? ' is-collapsed' : ''}`}
          aria-hidden={collapsed}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`client-navbar__nav-item${isActive ? ' client-navbar__nav-item--active' : ''}`}
              >
                <span className="client-navbar__nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right: Notifications + Account Avatar */}
        <div className="client-navbar__actions">
          <Link
            href="/admin/dashboard" // In the future audit-logs or notifications if present
            className="topbar__icon-btn"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="topbar__notif-dot" />}
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            className="client-navbar__mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="client-navbar__mobile-menu">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`client-navbar__mobile-item${isActive ? ' client-navbar__mobile-item--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="client-navbar__nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
