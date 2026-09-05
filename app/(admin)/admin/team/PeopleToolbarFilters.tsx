'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const ROLE_OPTIONS: Option[] = [
  { value: 'ALL', label: 'All roles' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'TEAM_MEMBER', label: 'Members' },
]

const SORT_OPTIONS: Option[] = [
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recent' },
  { value: 'workload', label: 'Workload' },
]

function labelFor(options: Option[], value: string, fallback: string) {
  return options.find((o) => o.value === value)?.label ?? fallback
}

function FilterMenu({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: Option[]
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isFiltered = value !== 'ALL' && value !== 'name'

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="people-filter" ref={ref}>
      <button
        type="button"
        className={`people-filter__btn${isFiltered ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="people-filter__key">{label}</span>
        <span className="people-filter__val">{labelFor(options, value, value)}</span>
        <ChevronDown size={14} className="people-filter__chevron" />
      </button>
      {open && (
        <div className="people-filter__menu" role="listbox">
          {options.map((opt) => {
            const selected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`people-filter__item${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onSelect(opt.value)
                  setOpen(false)
                }}
              >
                <span>{opt.label}</span>
                {selected && <Check size={14} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PeopleToolbarFilters({
  search,
  status,
  role,
  sort,
}: {
  search?: string
  status?: string
  role?: string
  sort?: string
}) {
  const router = useRouter()
  const currentStatus = status || 'ALL'
  const currentRole = role || 'ALL'
  const currentSort = sort || 'name'

  const navigate = (overrides: { status?: string; role?: string; sort?: string }) => {
    const next = {
      search,
      status: overrides.status ?? currentStatus,
      role: overrides.role ?? currentRole,
      sort: overrides.sort ?? currentSort,
    }
    const sp = new URLSearchParams()
    if (next.search) sp.set('search', next.search)
    if (next.status && next.status !== 'ALL') sp.set('status', next.status)
    if (next.role && next.role !== 'ALL') sp.set('role', next.role)
    if (next.sort && next.sort !== 'name') sp.set('sort', next.sort)
    const q = sp.toString()
    router.push(q ? `/admin/team?${q}` : '/admin/team')
  }

  return (
    <div className="people-toolbar__filters">
      <FilterMenu
        label="Status"
        value={currentStatus}
        options={STATUS_OPTIONS}
        onSelect={(v) => navigate({ status: v })}
      />
      <FilterMenu
        label="Role"
        value={currentRole}
        options={ROLE_OPTIONS}
        onSelect={(v) => navigate({ role: v })}
      />
      <FilterMenu
        label="Sort"
        value={currentSort}
        options={SORT_OPTIONS}
        onSelect={(v) => navigate({ sort: v })}
      />
    </div>
  )
}
