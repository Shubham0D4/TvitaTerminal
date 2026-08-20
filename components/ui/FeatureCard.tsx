import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  buttonText?: string
  href?: string
  onClick?: () => void
  bannerImage?: string
}

export function FeatureCard({
  title,
  description,
  buttonText = "Let's start your project",
  href,
  onClick,
  bannerImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
}: FeatureCardProps) {
  const CardContent = (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-xxl)',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #101C6B 0%, #2340B8 100%)',
        color: '#FFFFFF',
        padding: 'var(--space-8) var(--space-6)',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: 'var(--space-6)',
      }}
    >
      {/* Background graphic */}
      {bannerImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bannerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.22,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <Sparkles size={14} style={{ color: '#8FA4E6' }} />
          <span>New Opportunities</span>
        </div>

        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            color: '#FFFFFF',
            lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: 'var(--space-6)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          {description}
        </p>

        {href ? (
          <Link
            href={href}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: '46px',
              padding: '0 var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              background: '#FFFFFF',
              color: '#2340B8',
              fontWeight: 'var(--font-bold)',
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <span>{buttonText}</span>
            <ArrowRight size={16} />
          </Link>
        ) : (
          <button
            onClick={onClick}
            type="button"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: '46px',
              padding: '0 var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              background: '#FFFFFF',
              color: '#2340B8',
              fontWeight: 'var(--font-bold)',
              fontSize: 'var(--text-sm)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span>{buttonText}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return CardContent
}
