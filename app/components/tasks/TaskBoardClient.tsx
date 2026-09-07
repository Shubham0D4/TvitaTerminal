'use client'

import { useState } from 'react'
import TaskStatusButton from '@/app/(team)/team/tasks/TaskStatusButton'
import TaskDetailsModal from './TaskDetailsModal'
import { History, Plus } from 'lucide-react'
import CreateTaskModal from './CreateTaskModal'
import { withLeadAssignee } from '@/lib/process/stages'

interface TaskBoardClientProps {
  tasks: any[]
  userId: string
  userRole: string
  teamRole: string | null
  isLeadOrAdmin: boolean
  projects?: any[]
}

function canUpdateTask(task: any, userId: string, userRole: string) {
  if (userRole === 'ADMIN') return true
  if (task.project?.leadId === userId) return true
  return [task.assigneeId, task.developerId, task.testerId].includes(userId)
}

export default function TaskBoardClient({
  tasks,
  userId,
  userRole,
  teamRole,
  isLeadOrAdmin,
  projects = [],
}: TaskBoardClientProps) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const todoTasks = tasks.filter((t) => t.status === 'TODO')
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS')
  const testingTasks = tasks.filter((t) => t.status === 'READY_FOR_TESTING' || t.status === 'IN_TESTING')
  const changesTasks = tasks.filter((t) => t.status === 'CHANGES_REQUIRED')
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED')

  const columns = [
    { key: 'todo', label: 'To do', tone: 'slate', items: todoTasks },
    { key: 'progress', label: 'In progress', tone: 'blue', items: inProgressTasks },
    { key: 'qa', label: 'QA queue', tone: 'amber', items: testingTasks },
    { key: 'changes', label: 'Changes', tone: 'red', items: changesTasks },
    { key: 'done', label: 'Done', tone: 'green', items: completedTasks },
  ]

  return (
    <div>
      {isLeadOrAdmin && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      )}

      <div className="kanban">
        {columns.map((col) => (
          <section key={col.key} className={`kanban__col kanban__col--${col.tone}`}>
            <header className="kanban__head">
              <span>{col.label}</span>
              <span className="kanban__count">{col.items.length}</span>
            </header>
            <div className="kanban__stack">
              {col.items.length === 0 ? (
                <p className="kanban__empty">Nothing here</p>
              ) : (
                col.items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    userId={userId}
                    userRole={userRole}
                    teamRole={teamRole}
                    onOpen={() => setSelectedTask(t)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Task Details & Activity Trail Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          isLeadOrAdmin={isLeadOrAdmin}
          projectMembers={withLeadAssignee(
            (selectedTask.project?.members || []).map((m: any) => ({
              profileId: m.profileId ?? m.profile?.id,
              role: m.role,
              profile: { id: m.profile.id, name: m.profile.name },
            })),
            selectedTask.project?.lead
          )}
        />
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <CreateTaskModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          projects={projects}
        />
      )}
    </div>
  )
}

function TaskCard({
  task,
  userId,
  userRole,
  teamRole,
  onOpen,
}: {
  task: any
  userId: string
  userRole: string
  teamRole: string | null
  onOpen: () => void
}) {
  const canUpdate = canUpdateTask(task, userId, userRole)
  return (
    <div className="task-card" onClick={onOpen}>
      <div style={{ height: 70, backgroundImage: `url(${task.project?.banner || '/banner.webp'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>{task.project?.client?.name} / {task.project?.name}</span>
          <History size={13} style={{ color: 'var(--text-muted)' }} />
        </div>

      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
        {task.title}
      </div>

      {task.description && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {task.description}
        </div>
      )}

      {/* Assignee details */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
        {task.developer && <div>Dev: {task.developer.name}</div>}
        {task.tester && <div>QA: {task.tester.name}</div>}
      </div>

      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking status button
      >
        <span
          className="badge"
          style={{
            fontSize: 10,
            background:
              task.priority === 'URGENT'
                ? 'rgba(239, 68, 68, 0.15)'
                : task.priority === 'HIGH'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'var(--bg-overlay)',
            color:
              task.priority === 'URGENT'
                ? 'var(--color-danger)'
                : task.priority === 'HIGH'
                ? 'var(--color-warning)'
                : 'var(--text-muted)',
          }}
        >
          {task.priority}
        </span>

        {canUpdate ? (
          <TaskStatusButton
            taskId={task.id}
            currentStatus={task.status}
            userRole={userRole}
            teamRole={teamRole}
          />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {String(task.status).replace(/_/g, ' ')}
          </span>
        )}
      </div>
      </div>
    </div>
  )
}
