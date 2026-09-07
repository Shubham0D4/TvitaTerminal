export const AGENCY_TEAM_LABEL = 'Tvita team'

/** Clients may only see the project lead by name; everyone else is the agency. */
export function agencyNameForClient(
  person: { id: string; name: string; role?: string } | null | undefined,
  leadId: string | null | undefined
): string {
  if (!person) return AGENCY_TEAM_LABEL
  if (person.role === 'CLIENT') return person.name
  if (leadId && person.id === leadId) return person.name
  return AGENCY_TEAM_LABEL
}

export function redactAgencyPersonForClient<T extends { id: string; name: string; role?: string }>(
  person: T,
  leadId: string | null | undefined
): T {
  if (person.role === 'CLIENT') return person
  if (leadId && person.id === leadId) return person
  return { ...person, name: AGENCY_TEAM_LABEL }
}
