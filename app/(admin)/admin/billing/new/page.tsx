import { prisma } from '@/lib/prisma'
import InvoiceForm from '../InvoiceForm'

export const metadata = {
  title: 'Create Invoice — Tvita Admin',
  description: 'Generate a GST-compliant tax invoice for agency services.',
}

type SearchParams = Promise<{ clientId?: string; projectId?: string }>

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { clientId, projectId } = await searchParams

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true, gstin: true, country: true },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      select: { id: true, name: true, clientId: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="form-shell form-shell--wide">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Generate Invoice</h1>
          <p className="page-header__subtitle">
            Compose a GST tax invoice — party details, line items, and tax mode
          </p>
        </div>
      </div>

      <InvoiceForm
        clients={clients}
        projects={projects}
        initialClientId={clientId}
        initialProjectId={projectId}
      />
    </div>
  )
}
