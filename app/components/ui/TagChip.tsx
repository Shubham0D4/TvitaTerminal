import React from 'react'

export type TagVariant = 
  | 'paid' 
  | 'completed' 
  | 'active' 
  | 'in_progress' 
  | 'due' 
  | 'overdue' 
  | 'cancelled' 
  | 'planned' 
  | 'on_hold'

interface TagChipProps {
  label: string
  variant?: TagVariant
  size?: 'sm' | 'md'
  className?: string
}

export function TagChip({ label, variant = 'active', size = 'md', className = '' }: TagChipProps) {
  const getStyles = (): { bg: string; color: string } => {
    switch (variant) {
      case 'paid':
      case 'completed':
        return { bg: '#DFF0E8', color: '#1E6B50' } // detailGreenTint & detailGreen
      case 'due':
      case 'on_hold':
      case 'active':
      case 'in_progress':
        return { bg: '#FFF3D6', color: '#8A6A0B' } // stripYellowTint & stripYellow
      case 'overdue':
      case 'cancelled':
        return { bg: 'rgba(229, 72, 77, 0.12)', color: '#E5484D' } // dangerRed
      case 'planned':
      default:
        return { bg: '#DBE2F8', color: '#2340B8' } // brand accent
    }
  }

  const { bg, color } = getStyles()
  const padding = size === 'sm' ? '2px 8px' : '4px 12px'
  const fontSize = size === 'sm' ? '10px' : '11px'

  return (
    <span
      className={`tag-chip ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        backgroundColor: bg,
        color: color,
        borderRadius: 'var(--radius-full)',
        fontSize,
        fontWeight: 'var(--font-bold)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
