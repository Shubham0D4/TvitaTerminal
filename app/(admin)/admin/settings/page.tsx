import { prisma } from '@/lib/prisma'
import SettingsForm from './SettingsForm'

export const metadata = {
  title: 'Settings — Tvita Admin',
  description: 'Configure your agency profile, GST, bank details, and invoice settings.',
}

export default async function AdminSettingsPage() {
  const rawSettings = await prisma.appSettings.findFirst()
  const settings = rawSettings ? JSON.parse(JSON.stringify(rawSettings)) : null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Settings</h1>
          <p className="page-header__subtitle">
            Manage your agency profile, tax configuration, and invoice defaults.
          </p>
        </div>
      </div>

      <SettingsForm settings={settings} />
    </div>
  )
}
