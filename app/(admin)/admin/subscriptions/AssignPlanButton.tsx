'use client'

import { useState } from 'react'
import { apiClient } from '@/shared/utilities/api-client'
import toast from 'react-hot-toast'
import { Plus, CheckCircle2 } from 'lucide-react'

interface AssignPlanButtonProps {
  clients: { id: string; name: string }[]
  plans: { id: string; name: string }[]
}

export default function AssignPlanButton({ clients, plans }: AssignPlanButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleAssign = async () => {
    if (!selectedClient || !selectedPlan) {
      toast.error('Please select both a client and a plan')
      return
    }

    setIsPending(true)
    const res = await apiClient('/api/admin/subscriptions/assign', {
      method: 'POST',
      body: JSON.stringify({ clientId: selectedClient, planId: selectedPlan }),
    })
    setIsPending(false)

    if (res.success) {
      toast.success('Subscription plan assigned successfully.')
      setOpen(false)
      setSelectedClient('')
      setSelectedPlan('')
      window.location.reload()
    } else {
      toast.error(res.error?.message || 'Failed to assign subscription.')
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn--secondary">
        <Plus size={16} />
        Assign Plan to Client
      </button>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 450, padding: 'var(--space-4)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
        Assign Subscription Plan
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div>
          <label className="form-label">Client</label>
          <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Subscription Plan</label>
          <select
            className="form-select"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            <option value="">Select plan...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-2)' }}>
          <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost btn--xs">Cancel</button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isPending || !selectedClient || !selectedPlan}
            className={`btn btn--primary btn--xs${isPending ? ' btn--loading' : ''}`}
          >
            Assign Subscription
          </button>
        </div>
      </div>
    </div>
  )
}
