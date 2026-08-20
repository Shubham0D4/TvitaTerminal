import React from 'react'

interface ProfileGroupProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ProfileGroup({ title, description, children, className = '', style }: ProfileGroupProps) {
  return (
    <div
      className={`profile-group ${className}`.trim()}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-bold)',
            color: 'var(--text-primary)',
            marginBottom: description ? '4px' : 'var(--space-4)',
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {description}
        </p>
      )}
      <div>{children}</div>
    </div>
  )
}
