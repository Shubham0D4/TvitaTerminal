'use client'

import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import ProjectUpdateModal from './ProjectUpdateModal'

interface Props {
  projectId: string
}

export default function PublishUpdateTrigger({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn--secondary btn--sm"
      >
        <Megaphone size={14} />
        <span>Publish Revision</span>
      </button>

      <ProjectUpdateModal
        projectId={projectId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
