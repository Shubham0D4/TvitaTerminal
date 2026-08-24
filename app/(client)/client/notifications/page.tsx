import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'

import { getServerUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import MarkAllReadButton from '@/app/components/client/MarkAllReadButton'

export const metadata = {
  title: 'Notifications — Tvita Client Portal',
}

const PAGE_SIZE = 50

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function ClientNotificationsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      createdAt: true,
    },
  })

  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Notifications</h1>
          <p className="page-header__subtitle">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'You’re all caught up'}
          </p>
        </div>

        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={28} />
            <div className="empty-state__title">No notifications yet</div>
            <div className="empty-state__desc">
              Updates about your projects, invoices and approvals will appear here.
            </div>
          </div>
        </div>
      ) : (
        <ul className="notif-list">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`notif${notification.isRead ? '' : ' notif--unread'}`}
            >
              <span className="notif__dot" aria-hidden="true" />

              <div className="notif__body">
                <div className="notif__head">
                  <span className="notif__title">{notification.title}</span>
                  <time className="notif__time">{formatTimestamp(notification.createdAt)}</time>
                </div>
                {notification.message && (
                  <p className="notif__message">{notification.message}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
