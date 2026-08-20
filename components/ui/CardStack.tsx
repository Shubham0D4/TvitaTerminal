import React from 'react'

interface CardStackProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CardStack({ children, className = '', style }: CardStackProps) {
  return (
    <div className={`card-stack ${className}`.trim()} style={{ position: 'relative', marginBottom: 'var(--space-6)', ...style }}>
      {/* Receding Layer 2 (Bottom layer) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-12px',
          left: '4%',
          right: '4%',
          height: '24px',
          background: 'var(--accent-secondary)',
          borderRadius: 'var(--radius-xl)',
          opacity: 0.4,
          zIndex: 0,
        }}
      />
      {/* Receding Layer 1 (Middle layer) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '2%',
          right: '2%',
          height: '20px',
          background: 'var(--accent-primary-muted)',
          borderRadius: 'var(--radius-xl)',
          opacity: 0.8,
          zIndex: 1,
        }}
      />
      {/* Main Front Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  )
}
