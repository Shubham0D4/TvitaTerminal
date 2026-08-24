import React from 'react'
import Link from 'next/link'
import { TagChip } from './TagChip'
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'

interface BillHeroCardProps {
  id: string
  number: string
  projectName?: string
  amount: number
  currency?: string
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate?: string | null
  platformUrl?: string | null
  platformName?: string | null
}

export function BillHeroCard({
  id,
  number,
  projectName,
  amount,
  currency = 'USD',
  status,
  dueDate,
  platformUrl,
  platformName,
}: BillHeroCardProps) {
  const isPaid = status === 'PAID'
  const tagVariant = isPaid ? 'paid' : status === 'OVERDUE' ? 'overdue' : 'due'

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xxl)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: isPaid ? 'var(--color-success)' : 'var(--accent-gradient)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-primary-muted)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Invoice #{number}</div>
            {projectName && (
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                {projectName}
              </div>
            )}
          </div>
        </div>
        <TagChip label={status} variant={tagVariant} />
      </div>

      <div style={{ margin: 'var(--space-2) 0' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Amount</div>
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        {dueDate && !isPaid && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: '4px' }}>
            Due on {new Date(dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        {platformUrl ? (
          <a
            href={platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary w-full"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', height: '44px' }}
          >
            <span>Pay on {platformName || 'External Platform'}</span>
            <ExternalLink size={16} />
          </a>
        ) : !isPaid ? (
          <Link
            href={`/client/invoices/${id}`}
            className="btn btn--primary w-full"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', height: '44px' }}
          >
            <span>Pay Now</span>
            <ShieldCheck size={16} />
          </Link>
        ) : (
          <Link
            href={`/client/invoices/${id}`}
            className="btn btn--secondary w-full"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', height: '44px' }}
          >
            <span>View Receipt</span>
          </Link>
        )}
      </div>
    </div>
  )
}
