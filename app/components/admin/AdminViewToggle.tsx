import Link from 'next/link'
import { LayoutGrid, List, GalleryHorizontal } from 'lucide-react'

export type AdminViewMode = 'grid' | 'list' | 'deck'

const MODES: { id: AdminViewMode; title: string; icon: typeof LayoutGrid }[] = [
  { id: 'grid', title: 'Grid view', icon: LayoutGrid },
  { id: 'list', title: 'List view', icon: List },
  { id: 'deck', title: 'Deck view', icon: GalleryHorizontal },
]

/** Icon-only view toggle. Pass `modes` to limit options (clients = grid+list). */
export default function AdminViewToggle({
  value,
  hrefFor,
  modes = ['grid', 'list'],
}: {
  value: AdminViewMode
  hrefFor: (view: AdminViewMode) => string
  modes?: AdminViewMode[]
}) {
  const visible = MODES.filter((m) => modes.includes(m.id))

  return (
    <div className="view-toggle" role="group" aria-label="View mode">
      {visible.map(({ id, title, icon: Icon }) => (
        <Link
          key={id}
          href={hrefFor(id)}
          className={`view-toggle__btn${value === id ? ' is-active' : ''}`}
          aria-pressed={value === id}
          title={title}
          aria-label={title}
          replace
          scroll={false}
        >
          <Icon size={15} />
        </Link>
      ))}
    </div>
  )
}
