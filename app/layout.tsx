import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Tvita — Agency Management',
    template: '%s | Tvita',
  },
  description: 'Professional agency management platform for clients, teams, and projects.',
  keywords: ['agency management', 'project management', 'client portal', 'team collaboration'],
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: { primary: 'var(--color-success)', secondary: 'transparent' },
            },
            error: {
              iconTheme: { primary: 'var(--color-danger)', secondary: 'transparent' },
            },
          }}
        />
      </body>
    </html>
  )
}

