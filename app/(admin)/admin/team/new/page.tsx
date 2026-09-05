import TeamMemberForm from '../TeamMemberForm'

export const metadata = {
  title: 'Add Person — Tvita Admin',
  description: 'Onboard a new staff member to your agency.',
}

export default function NewTeamMemberPage() {
  return (
    <div className="form-shell">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Add Person</h1>
          <p className="page-header__subtitle">
            Create a profile, assign a role, and invite them to the workspace.
          </p>
        </div>
      </div>

      <TeamMemberForm />
    </div>
  )
}
