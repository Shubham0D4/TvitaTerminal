'use client'

import { useState } from 'react'
import TaskStatusButton from '@/app/(team)/team/tasks/TaskStatusButton'
import TaskDetailsModal from './TaskDetailsModal'
import { History, Plus } from 'lucide-react'
import CreateTaskModal from './CreateTaskModal'

interface TaskBoardClientProps {
  tasks: any[]
  userRole: string
  teamRole: string | null
  isLeadOrAdmin: boolean
  projects?: any[]
}

export default function TaskBoardClient({
  tasks,
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

  return (
    <div>
      {/* Header action button for Lead / Admin */}
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

      {/* Task Kanban Grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Col 1: To Do */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              To Do ({todoTasks.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {todoTasks.map((t) => (
              <TaskCard key={t.id} task={t} userRole={userRole} teamRole={teamRole} onOpen={() => setSelectedTask(t)} />
            ))}
          </div>
        </div>

        {/* Col 2: In Progress */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
              In Progress ({inProgressTasks.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {inProgressTasks.map((t) => (
              <TaskCard key={t.id} task={t} userRole={userRole} teamRole={teamRole} onOpen={() => setSelectedTask(t)} />
            ))}
          </div>
        </div>

        {/* Col 3: Ready for QA / Testing */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)', textTransform: 'uppercase' }}>
              QA Queue ({testingTasks.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {testingTasks.map((t) => (
              <TaskCard key={t.id} task={t} userRole={userRole} teamRole={teamRole} onOpen={() => setSelectedTask(t)} />
            ))}
          </div>
        </div>

        {/* Col 4: Changes Required */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--color-danger)', textTransform: 'uppercase' }}>
              Changes Req. ({changesTasks.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {changesTasks.map((t) => (
              <TaskCard key={t.id} task={t} userRole={userRole} teamRole={teamRole} onOpen={() => setSelectedTask(t)} />
            ))}
          </div>
        </div>

        {/* Col 5: Completed */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)', textTransform: 'uppercase' }}>
              Completed ({completedTasks.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {completedTasks.map((t) => (
              <TaskCard key={t.id} task={t} userRole={userRole} teamRole={teamRole} onOpen={() => setSelectedTask(t)} />
            ))}
          </div>
        </div>
      </div>

      {/* Task Details & Activity Trail Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          isLeadOrAdmin={isLeadOrAdmin}
          projectMembers={selectedTask.project?.members || []}
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
  userRole,
  teamRole,
  onOpen,
}: {
  task: any
  userRole: string
  teamRole: string | null
  onOpen: () => void
}) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
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

        <TaskStatusButton
          taskId={task.id}
          currentStatus={task.status}
          userRole={userRole}
          teamRole={teamRole}
        />
      </div>
    </div>
  )
}
