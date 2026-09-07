'use client'

import {useState, useEffect} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  House,
  Folder,
  Receipt,
  User,
  Users,
  Bell,
  Menu,
  X,
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


export default function ClientNavbar({ isSubTeam: isSubTeamProp = false, subTeamCtx }: ClientNavbarProps) {
  const isSubTeam = Boolean(subTeamCtx || isSubTeamProp)
  const policy = subTeamCtx?.policy
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(2)


  // Focused workspaces: back on the left, logo centred, no menu.
  const FOCUS_ROUTES = ['/client/notes', '/client/tickets']
  // A single project is focused too; the projects list itself is not.
  const projectDetail = /^\/client\/projects\/[^/]+/.test(pathname)
  const focusMode = projectDetail || FOCUS_ROUTES.some((route) => pathname.startsWith(route))
  // Back lands where the user came from, not always at home.
  const backHref = projectDetail ? '/client/projects' : '/client/home'
  const [collapsed, setCollapsed] = useState(false)

  // Derived during render — setting it in the effect below would cascade renders.
  if (!focusMode && collapsed) setCollapsed(false)

  // One frame after landing, so the menu is painted in place first and is then
  // seen sliding away.
  useEffect(() => {
    if (!focusMode) return
    const frame = requestAnimationFrame(() => setCollapsed(true))
    return () => cancelAnimationFrame(frame)
  }, [focusMode])

  const navItems = [
    { label: 'Home', href: '/client/home', icon: <House size={17} />, show: true },
    { label: 'Projects', href: '/client/projects', icon: <Folder size={17} />, show: !isSubTeam || policy?.projects !== false },
    { label: 'Team', href: '/client/teams', icon: <Users size={17} />, show: !isSubTeam },
    { label: 'Billing', href: '/client/invoices', icon: <Receipt size={17} />, show: !isSubTeam || Boolean(policy?.invoices || policy?.billing) },
    { label: 'Profile', href: '/client/profile', icon: <User size={17} />, show: true },
  ].filter(item => item.show)


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
            aria-label={projectDetail ? 'Back to projects' : 'Back to home'}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
        )}

        {/* Left: Brand Logo & Client Portal Label */}
        <div className={`client-navbar__brand${focusMode ? ' is-centred' : ''}`}>
          <Link href="/client/home" className="client-navbar__logo-link">
            <Image src="/logo.webp" alt="Tvita" width={48} height={48} priority />
            <span className="sidebar__logo-name" style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              Tvita
              {isSubTeam && (
                <sub style={{ fontSize: '0.55em', marginLeft: '2px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'lowercase', bottom: '-0.2em' }}>
                  team
                </sub>
              )}
            </span>
          </Link>
          {subTeamCtx?.teamName && subTeamCtx.teamName !== '__default__' && (
            <span className="client-navbar__portal-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
              Team: {subTeamCtx.teamName}
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav
          className={`client-navbar__nav${collapsed ? ' is-collapsed' : ''}`}
          aria-hidden={collapsed}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/client/home' && pathname.startsWith(item.href))
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

        {/* Right: Notifications + account avatar */}
        <div className="client-navbar__actions">
          <Link
            href="/client/notifications"
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
            const isActive = pathname === item.href || (item.href !== '/client/home' && pathname.startsWith(item.href))
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
