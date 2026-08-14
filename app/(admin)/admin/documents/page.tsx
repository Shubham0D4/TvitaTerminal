import { redirect } from 'next/navigation'

// Documents have been removed from all portals.
export default function AdminDocumentsPage() {
  redirect('/admin/projects')
}
