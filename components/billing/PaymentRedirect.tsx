'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react'

const PLATFORM_LABELS: Record<string, string> = {
  upwork: 'Upwork',
  freelancer: 'Freelancer.com',
  fiverr: 'Fiverr',
  toptal: 'Toptal',
  guru: 'Guru',
  peopleperhour: 'PeoplePerHour',
}

const PLATFORM_COLORS: Record<string, string> = {
  upwork: '#14a800',
  freelancer: '#29b2fe',
  fiverr: '#1dbf73',
  toptal: '#204ecf',
  guru: '#f37b27',
  peopleperhour: '#ff7401',
}

interface Props {
  clientSource: string
  externalPlatformUrl: string
  clientName?: string
}

export default function PaymentRedirect({ clientSource, externalPlatformUrl, clientName }: Props) {
  const [countdown, setCountdown] = useState(5)
  const [redirected, setRedirected] = useState(false)

  const platformLabel = PLATFORM_LABELS[clientSource] ?? 'your payment platform'
  const accentColor = PLATFORM_COLORS[clientSource] ?? 'var(--accent-primary)'

  useEffect(() => {
    if (redirected) return
    if (countdown <= 0) {
      setRedirected(true)
      window.open(externalPlatformUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, redirected, externalPlatformUrl])

  const handleRedirectNow = () => {
    setRedirected(true)
    window.open(externalPlatformUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 540,
          width: '100%',
          textAlign: 'center',
          padding: 'var(--space-10)',
          border: `1px solid ${accentColor}33`,
          boxShadow: `0 0 40px ${accentColor}18`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative glow blob */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `${accentColor}22`,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Platform icon pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}44`,
            marginBottom: 'var(--space-6)',
          }}
        >
          <ShieldCheck size={14} style={{ color: accentColor }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: accentColor, letterSpacing: '0.05em' }}>
            EXTERNAL PAYMENT PLATFORM
          </span>
        </div>

        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
            lineHeight: 1.3,
          }}
        >
          Payments are processed on{' '}
          <span style={{ color: accentColor }}>{platformLabel}</span>
        </h1>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-8)', lineHeight: 1.7 }}>
          {clientName ? `${clientName}, your` : 'Your'} invoices and payments for this engagement
          are managed directly on <strong style={{ color: 'var(--text-secondary)' }}>{platformLabel}</strong>.
          You will be redirected there momentarily.
        </p>

        {/* Countdown ring */}
        {!redirected && (
          <div style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: `4px solid ${accentColor}33`,
                borderTopColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                color: accentColor,
                animation: 'spin-slow 1s linear infinite',
                position: 'relative',
              }}
            >
              {countdown}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Redirecting in {countdown}s…
            </span>
          </div>
        )}

        {redirected && (
          <p style={{ fontSize: 'var(--text-sm)', color: accentColor, marginBottom: 'var(--space-6)', fontWeight: 'var(--font-semibold)' }}>
            ✓ Opened {platformLabel} in a new tab
          </p>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRedirectNow}
            className="btn btn--primary"
            style={{ background: accentColor, borderColor: accentColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Go to {platformLabel} <ExternalLink size={14} />
          </button>
          <a href="/client/dashboard" className="btn btn--ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Back to Dashboard <ArrowRight size={14} />
          </a>
        </div>

        <p style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', lineHeight: 1.6 }}>
          All contracts, milestones, and payment terms for this engagement are governed by{' '}
          <strong>{platformLabel}</strong>&rsquo;s platform policies.
        </p>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
