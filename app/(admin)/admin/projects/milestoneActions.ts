'use server'

import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createSupabaseAdminClient } from '@/infrastructure/supabase/server'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function uploadMilestoneImage(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null
  try {
    const adminSupabase = createSupabaseAdminClient()
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'tvita-documents'
    const fileName = `milestones/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await adminSupabase.storage
      .from(bucket)
      .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: true })

    if (!error && data) {
      const { data: publicUrlData } = adminSupabase.storage.from(bucket).getPublicUrl(fileName)
      if (publicUrlData?.publicUrl) return publicUrlData.publicUrl
    }
  } catch (e) {
    console.error('Storage upload fallback:', e)
  }

  // Fallback: Convert to Base64 Data URL if storage bucket fails
  const buffer = Buffer.from(await file.arrayBuffer())
  return `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

async function requireLead(projectId: string) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  if (user.role === 'ADMIN') return user // admin always allowed

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (project?.leadId !== user.id) {
    throw new Error('Only the project lead can perform this action.')
  }
  return user
}

async function recalcProgress(projectId: string) {
  const all = await prisma.milestone.findMany({ where: { projectId } })
  const done = all.filter((m) => m.status === 'COMPLETED').length
  const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0
  await prisma.project.update({ where: { id: projectId }, data: { progress: pct } })
}

async function findLeastBusyMember(projectId: string, role?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { leadId: true } })
  const members = await prisma.projectMember.findMany({
    where: { projectId, ...(role ? { role } : {}) },
    select: { profileId: true },
  })

  const candidateIds = new Set(members.map((m) => m.profileId))
  if (project?.leadId && (!role || role === 'TEAM_LEAD')) {
    candidateIds.add(project.leadId)
  }

  if (candidateIds.size === 0) return null

  // Count in-progress milestones per candidate
  const counts = await Promise.all(
    Array.from(candidateIds).map(async (profileId) => {
      const count = await prisma.milestone.count({
        where: { assigneeId: profileId, status: 'IN_PROGRESS' },
      })
      return { profileId, count }
    })
  )
  counts.sort((a, b) => a.count - b.count)
  return counts[0].profileId
}

// ─────────────────────────────────────────────
// CREATE MILESTONE  (lead only)
// ─────────────────────────────────────────────

const MilestoneSchema = z.object({
  name:        z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  dueDate:     z.string().optional(),
  assigneeId:  z.string().uuid().optional().or(z.literal('')),
  assigneeRole:z.string().optional(),
  autoAssign:  z.string().optional(),  // 'on'
})

export type MilestoneFormState = { success?: boolean; message?: string; errors?: Record<string, string[]> }

export async function createMilestone(
  projectId: string,
  _prev: MilestoneFormState,
  formData: FormData
): Promise<MilestoneFormState> {
  const user = await requireLead(projectId)

  const raw = Object.fromEntries(formData.entries())
  const parsed = MilestoneSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: 'Please fix errors.', errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const d = parsed.data
  const isAutoAssign = d.autoAssign === 'on'
  let assigneeId = d.assigneeId || null

  if (isAutoAssign) {
    assigneeId = await findLeastBusyMember(projectId, d.assigneeRole || undefined)
  }

  // Handle Image Uploads
  const imageFiles = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0)
  const imageUrlStrings = formData.getAll('imageUrls').filter((item): item is string => typeof item === 'string' && item.trim().length > 0)

  const processedUrls: string[] = [...imageUrlStrings]
  for (const file of imageFiles) {
    const url = await uploadMilestoneImage(file)
    if (url) processedUrls.push(url)
  }

  // Count existing so we can set sortOrder
  const count = await prisma.milestone.count({ where: { projectId } })

  await prisma.milestone.create({
    data: {
      projectId,
      name:        d.name,
      description: d.description || null,
      dueDate:     d.dueDate ? new Date(d.dueDate) : null,
      status:      'PLANNED',
      assigneeId:  assigneeId || null,
      assigneeRole:d.assigneeRole || null,
      autoAssign:  isAutoAssign,
      createdById: user.id,
      imageUrls:   processedUrls,
      clientVisible: false,  // only shown after COMPLETED
      sortOrder:   count,
    },
  })

  await recalcProgress(projectId)
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/team/projects/${projectId}`)
  return { success: true, message: 'Milestone created.' }
}

// ─────────────────────────────────────────────
// UPDATE MILESTONE STATUS (dev / tester / lead)
// ─────────────────────────────────────────────

export async function updateMilestoneStatus(
  milestoneId: string,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PLANNED' | 'BLOCKED'
): Promise<{ success: boolean; message: string }> {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
  if (!milestone) return { success: false, message: 'Milestone not found.' }

  // Lead / admin can do anything; assignee can only progress their own
  const isLead = user.role === 'ADMIN' || (
    await prisma.project.findUnique({ where: { id: milestone.projectId }, select: { leadId: true } })
  )?.leadId === user.id

  if (!isLead && milestone.assigneeId !== user.id) {
    return { success: false, message: 'You are not assigned to this milestone.' }
  }

  const isCompleting = status === 'COMPLETED'

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status,
      clientVisible: isCompleting,  // auto-publish to client when completed
      completedDate: isCompleting ? new Date() : null,
    },
  })

  await recalcProgress(milestone.projectId)
  revalidatePath(`/admin/projects/${milestone.projectId}`)
  revalidatePath(`/team/projects/${milestone.projectId}`)
  revalidatePath(`/team/milestones`)
  revalidatePath(`/client/projects/${milestone.projectId}`)
  return { success: true, message: `Milestone marked ${status.replace('_', ' ')}.` }
}

// ─────────────────────────────────────────────
// DELETE MILESTONE  (lead only)
// ─────────────────────────────────────────────

export async function deleteMilestone(
  milestoneId: string
): Promise<{ success: boolean; message: string }> {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
  if (!milestone) return { success: false, message: 'Not found.' }

  await requireLead(milestone.projectId)
  await prisma.milestone.delete({ where: { id: milestoneId } })
  await recalcProgress(milestone.projectId)

  revalidatePath(`/admin/projects/${milestone.projectId}`)
  revalidatePath(`/team/projects/${milestone.projectId}`)
  return { success: true, message: 'Milestone deleted.' }
}

// ─────────────────────────────────────────────
// CREATE APPROVAL  (lead only)
// ─────────────────────────────────────────────

const ApprovalSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
})

export type ApprovalFormState = { success?: boolean; message?: string }

export async function createApproval(
  projectId: string,
  _prev: ApprovalFormState,
  formData: FormData
): Promise<ApprovalFormState> {
  const user = await requireLead(projectId)

  const parsed = ApprovalSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { success: false, message: 'Title is required.' }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } })
  if (!project) return { success: false, message: 'Project not found.' }

  await prisma.clientApproval.create({
    data: {
      projectId,
      clientId:    project.clientId,
      title:       parsed.data.title,
      description: parsed.data.description || null,
      status:      'PENDING',
      createdById: user.id,
    },
  })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/client/projects/${projectId}`)
  return { success: true, message: 'Approval request sent to client.' }
}

// ─────────────────────────────────────────────
// RESPOND TO APPROVAL  (client only)
// ─────────────────────────────────────────────

export async function respondToApproval(
  approvalId: string,
  response: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
  clientNote: string
): Promise<{ success: boolean; message: string }> {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const approval = await prisma.clientApproval.findUnique({
    where: { id: approvalId },
    include: { client: { select: { profileId: true, email: true } } },
  })
  if (!approval) return { success: false, message: 'Approval not found.' }

  // Verify caller is the client
  if (approval.client.profileId !== user.id && approval.client.email !== user.email) {
    return { success: false, message: 'Unauthorised.' }
  }

  await prisma.clientApproval.update({
    where: { id: approvalId },
    data: { status: response, clientNote: clientNote || null, respondedAt: new Date() },
  })

  revalidatePath(`/client/projects/${approval.projectId}`)
  revalidatePath(`/admin/projects/${approval.projectId}`)
  return { success: true, message: `Approval ${response.toLowerCase().replace('_', ' ')}.` }
}
