import Link from 'next/link'
import { FolderKanban, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="auth-card"
        style={{
          textAlign: 'center',
          maxWidth: '520px',
          padding: 'var(--space-10) var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-2xl)',
            background: 'var(--accent-primary-muted)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-2)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <FolderKanban size={40} />
        </div>

        <h1
          style={{
            fontSize: 'var(--text-4xl)',
            fontWeight: 'var(--font-bold)',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}
        >
          404
        </h1>

        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          Page Not Found
        </h2>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 'var(--leading-relaxed)' }}>
          The page you are looking for doesn&apos;t exist, was moved, or you may not have authorization to view it.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" className="btn btn--primary btn--lg">
            <Home size={18} />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
