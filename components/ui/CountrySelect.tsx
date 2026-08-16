'use client'

import { useState, useRef, useEffect } from 'react'
import { COUNTRIES, getFlagEmoji, getCountryByCode } from '@/shared/utilities/countries'
import { ChevronDown, Search, X } from 'lucide-react'

interface CountrySelectProps {
  name: string
  id?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  className?: string
  onChange?: (code: string) => void
}

export default function CountrySelect({
  name,
  id,
  defaultValue = '',
  placeholder = 'Select country…',
  required = false,
  className = '',
  onChange,
}: CountrySelectProps) {
  const [selected, setSelected] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedCountry = selected ? getCountryByCode(selected) : null

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = (code: string) => {
    setSelected(code)
    setOpen(false)
    setSearch('')
    if (onChange) onChange(code)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected('')
    setSearch('')
    if (onChange) onChange('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} id={id} value={selected} required={required} />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          background: open ? 'var(--bg-overlay)' : undefined,
          borderColor: open ? 'var(--border-focus)' : undefined,
          boxShadow: open ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : undefined,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedCountry ? (
          <>
            <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }}>
              {getFlagEmoji(selectedCountry.code)}
            </span>
            <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {selectedCountry.name}
            </span>
            <span
              onClick={handleClear}
              style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            >
              <X size={13} />
            </span>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: 'var(--text-disabled)', fontSize: 'var(--text-sm)' }}>
              {placeholder}
            </span>
            <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'slideDown 0.12s ease',
          }}
          role="listbox"
        >
          {/* Search */}
          <div
            style={{
              padding: 'var(--space-2)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                No countries found
              </div>
            ) : (
              filtered.map((country) => {
                const isSelected = selected === country.code
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      border: 'none',
                      borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      background: isSelected ? 'var(--accent-primary-muted)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                      fontFamily: 'var(--font-family)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, width: 24, textAlign: 'center' }}>
                      {getFlagEmoji(country.code)}
                    </span>
                    <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {country.name}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {country.code}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
