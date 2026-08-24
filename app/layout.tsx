import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import AppToaster from '@/app/components/ui/AppToaster'
import './globals.css'

// Self-hosted by Next; matches the typeface used on tvita.in.
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Tvita — Agency Management',
    template: '%s | Tvita',
  },
  description: 'Professional agency management platform for clients, teams, and projects.',
  keywords: ['agency management', 'project management', 'client portal', 'team collaboration'],
  icons: {
    icon: { url: '/favicon.webp', type: 'image/webp' },
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
}

export const viewport: Viewport = {
  // Renders <meta name="color-scheme" content="light">, so the browser never
  // applies dark-mode UA styling to form controls or scrollbars.
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        {children}
        <SpeedInsights />
        <AppToaster />
      </body>
    </html>
  )
}

