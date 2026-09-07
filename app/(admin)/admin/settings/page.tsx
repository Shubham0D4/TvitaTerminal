import { prisma } from '@/lib/prisma'
import SettingsForm from './SettingsForm'

export const metadata = {
  title: 'Settings — Tvita Admin',
  description: 'Configure your agency profile, GST, bank details, and invoice settings.',
}

export default async function AdminSettingsPage() {
  const rawSettings = await prisma.appSettings.findFirst()
  const settings = rawSettings
    ? JSON.parse(JSON.stringify({
        ...rawSettings,
        smtpPass: undefined,
        smtpConfigured: Boolean(rawSettings.smtpPass),
      }))
    : null

  return (
    <div className="asettings-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Settings</h1>
          <p className="page-header__subtitle">
            Agency profile, tax configuration, security, and invoice defaults
          </p>
        </div>
      </div>

      <SettingsForm settings={settings} />
    </div>
  )
}
