'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client'
import toast from 'react-hot-toast'
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react'

interface TopbarProps {
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN': return 'Administrator'
    case 'TEAM_MEMBER': return 'Member'
    case 'CLIENT': return 'Client'
    default: return role
  }
}

function getSettingsHref(role: string): string {
  switch (role) {
    case 'ADMIN': return '/admin/settings'
    case 'TEAM_MEMBER': return '/team/profile'
    case 'CLIENT': return '/client/profile'
    default: return '/'
  }
}

export default function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  // Fetch live notifications
  useEffect(() => {
    let active = true
    async function loadNotifs() {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/notifications').then((r) => r.json())
        if (!active) return
        if (res?.data) {
          setNotifications(res.data.notifications || [])
          setUnreadCount(res.data.unreadCount || 0)
        }
      } catch (e) {
        // quiet error
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

  // Determine search destination based on active portal
  function getSearchAction(): string {
    if (pathname.startsWith('/admin')) return '/admin/projects'
    if (pathname.startsWith('/team')) return '/team/projects'
    if (pathname.startsWith('/client')) return '/client/projects'
    return '/admin/projects'
  }

  // Close dropdown on outside click
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
      // quiet error
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      try {
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut()
      } catch {
        // ignore supabase browser client errors
      }
      toast.success('Signed out successfully')
      await signOut({ callbackUrl: '/login' })
    } catch {
      toast.error('Failed to sign out')
      setLoggingOut(false)
    }
  }

  return (
    <header className="topbar">
      {/* Search */}
      <form
        className="topbar__search"
        method="GET"
        action={getSearchAction()}
      >
        <Search size={15} className="topbar__search-icon" />
        <input
          type="text"
          name="search"
          placeholder="Search projects…"
          className="topbar__search-input"
        />
      </form>

      {/* Right side */}
      <div className="topbar__right">
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="topbar__icon-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="topbar__notif-dot" />}
          </button>

          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 320,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                padding: 'var(--space-3)',
                zIndex: 100,
              }}
            >
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="btn btn--ghost btn--xs"
                    style={{ fontSize: 10 }}
                  >
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

        {/* Avatar + Dropdown */}
        <div className="topbar__user" ref={dropdownRef}>
          <button
            className="topbar__user-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="topbar__avatar topbar__avatar--img"
              />
            ) : (
              <div className="topbar__avatar topbar__avatar--initials">
                {getInitials(user.name)}
              </div>
            )}
            <div className="topbar__user-info">
              <span className="topbar__user-name">{user.name}</span>
              <span className="topbar__user-role">{getRoleLabel(user.role)}</span>
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
                href={getSettingsHref(user.role)}
                className="topbar__dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={14} />
                <span>{user.role === 'ADMIN' ? 'Settings' : 'Profile'}</span>
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
      </div>
    </header>
  )
}
