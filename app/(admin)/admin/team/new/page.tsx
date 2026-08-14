import TeamMemberForm from '../TeamMemberForm'

export const metadata = {
  title: 'Add Team Member — Tvita Admin',
  description: 'Onboard a new staff member to your agency.',
}

export default function NewTeamMemberPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Onboard Staff</h1>
          <p className="page-header__subtitle">
            Provide profile details and assign permissions for project management.
          </p>
        </div>
      </div>

      <TeamMemberForm />
    </div>
  )
}
