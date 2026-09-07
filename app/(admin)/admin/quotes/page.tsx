import { getServerUser, redirectToLogin } from '@/lib/auth/server'
import QuotesModule from '@/app/components/projects/QuotesModule'

export const metadata = {
  title: 'Quotes — Tvita Admin',
  description: 'Review and respond to client-submitted quote requests.',
}

export default async function AdminQuotesPage() {
  const user = await getServerUser()
  if (!user) redirectToLogin()

  return (
    <div className="aquotes">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Quotes</h1>
          <p className="page-header__subtitle">
            Open a quote to review the brief, negotiation history, and respond
          </p>
        </div>
      </div>

      <QuotesModule userRole={user.role} userId={user.id} />
    </div>
  )
}
