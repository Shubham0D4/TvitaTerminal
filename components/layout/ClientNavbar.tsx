'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client'
import toast from 'react-hot-toast'
import {
  LayoutDashboard,
  FolderKanban,
  Boxes,
  CreditCard,
  UserCircle,
  Bell,
  Search,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
  Users,
} from 'lucide-react'

import type { SubTeamContext } from '@/lib/auth/server'

interface ClientNavbarProps {
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }
  isSubTeam?: boolean
  subTeamCtx?: SubTeamContext | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ClientNavbar({ user, isSubTeam: isSubTeamProp = false, subTeamCtx }: ClientNavbarProps) {
  const isSubTeam = Boolean(subTeamCtx || isSubTeamProp)
  const policy = subTeamCtx?.policy
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(2)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { label: 'Dashboard', href: '/client/dashboard', icon: <LayoutDashboard size={17} />, show: true },
    { label: 'Projects', href: '/client/projects', icon: <FolderKanban size={17} />, show: !isSubTeam || policy?.projects !== false },
    { label: 'Subscriptions', href: '/client/subscriptions', icon: <Boxes size={17} />, show: !isSubTeam || Boolean(policy?.subscriptions) },
    { label: 'Billing', href: '/client/invoices', icon: <CreditCard size={17} />, show: !isSubTeam || Boolean(policy?.invoices || policy?.billing) },
    { label: 'Profile', href: '/client/profile', icon: <UserCircle size={17} />, show: true },
  ].filter(item => item.show)

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    async function loadNotifs() {
      try {
        const res = await fetch('/api/notifications').then((r) => r.json())
        if (res?.data) {
          setNotifications(res.data.notifications || [])
          setUnreadCount(res.data.unreadCount || 0)
        }
      } catch (e) {
        // quiet
      }
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
    } catch (e) {
      // quiet
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      try {
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
      toast.success('Signed out successfully')
      await signOut({ callbackUrl: '/login' })
    } catch {
      toast.error('Failed to sign out')
      setLoggingOut(false)
    }
  }

  return (
    <header className="client-navbar">
      <div className="client-navbar__container">
        {/* Left: Brand Logo & Client Portal Label */}
        <div className="client-navbar__brand">
          <Link href="/client/dashboard" className="client-navbar__logo-link">
            <img src="/logo.png" alt="Tvita Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            <span className="sidebar__logo-name" style={{ fontSize: 'var(--text-lg)', display: 'inline-flex', alignItems: 'baseline' }}>
              Tvita
              {isSubTeam && (
                <sub style={{ fontSize: '0.55em', marginLeft: '2px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'lowercase', bottom: '-0.2em' }}>
                  team
                </sub>
              )}
            </span>
          </Link>
          {subTeamCtx?.teamName && (
            <span className="client-navbar__portal-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Team: {subTeamCtx.teamName}
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="client-navbar__nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/client/dashboard' && pathname.startsWith(item.href))
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
          {!isSubTeam && (
            <Link
              href="/client/teams"
              className={`client-navbar__nav-item${pathname.startsWith('/client/teams') ? ' client-navbar__nav-item--active' : ''}`}
            >
              <span className="client-navbar__nav-icon"><Users size={17} /></span>
              <span>Teams</span>
            </Link>
          )}
        </nav>

        {/* Right: Search + Notifications + User Menu */}
        <div className="client-navbar__actions">
          {/* Search */}
          <form className="topbar__search client-navbar__search" method="GET" action="/client/projects">
            <Search size={14} className="topbar__search-icon" />
            <input
              type="text"
              name="search"
              placeholder="Search projects…"
              className="topbar__search-input"
              style={{ fontSize: 'var(--text-xs)' }}
            />
          </form>

          {/* Notifications Dropdown */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              className="topbar__icon-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="topbar__notif-dot" />}
            </button>

            {notifOpen && (
              <div className="topbar__dropdown" style={{ width: 300, right: 0, top: 'calc(100% + 8px)' }}>
                <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                    Notifications ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className="btn btn--ghost btn--xs" style={{ fontSize: 10 }}>
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 280, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                          borderLeft: n.isRead ? 'none' : '3px solid var(--accent-primary)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{n.title}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: 11 }}>{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="topbar__user" ref={dropdownRef}>
            <button
              className="topbar__user-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-img-element
                <img src={user.avatarUrl} alt={user.name} className="topbar__avatar topbar__avatar--img" />
              ) : (
                <div className="topbar__avatar topbar__avatar--initials">
                  {getInitials(user.name)}
                </div>
              )}
              <div className="topbar__user-info">
                <span className="topbar__user-name">{user.name}</span>
                <span className="topbar__user-role">{isSubTeam ? 'Team Member' : 'Client'}</span>
              </div>
              <ChevronDown size={14} className={`topbar__chevron${dropdownOpen ? ' topbar__chevron--open' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="topbar__dropdown">
                <div className="topbar__dropdown-header">
                  <div className="topbar__dropdown-name">{user.name}</div>
                  <div className="topbar__dropdown-email">{user.email}</div>
                </div>
                <div className="topbar__dropdown-divider" />
                <Link
                  href="/client/profile"
                  className="topbar__dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <UserCircle size={14} />
                  <span>Profile Settings</span>
                </Link>
                <div className="topbar__dropdown-divider" />
                <button
                  className="topbar__dropdown-item topbar__dropdown-item--danger"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={14} />
                  <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </div>
            )}
          </div>

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
            const isActive = pathname === item.href || (item.href !== '/client/dashboard' && pathname.startsWith(item.href))
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
          {!isSubTeam && (
            <Link
              href="/client/teams"
              className={`client-navbar__mobile-item${pathname.startsWith('/client/teams') ? ' client-navbar__mobile-item--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="client-navbar__nav-icon"><Users size={17} /></span>
              <span>Teams</span>
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
