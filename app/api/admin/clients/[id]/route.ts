import { apiSuccess, Errors } from '@/lib/utils/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendClientInvite } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { getAppBaseUrl } from '@/lib/utils/url'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        profile: true,
        contacts: true,
        subTeams: {
          include: { profile: { select: { email: true, name: true, isActive: true } } },
        },
        projects: {
          include: {
            tasks: { select: { id: true, status: true } },
            milestones: { select: { id: true, status: true } },
          },
        },
        invoices: { orderBy: { createdAt: 'desc' } },
        subscriptions: { include: { plan: true } },
      },
    })

    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    return apiSuccess(client)
  } catch (error) {
    console.error('Admin client GET API error:', error)
    return Errors.INTERNAL('Failed to fetch client detail')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return Errors.NOT_FOUND('Client')
    }

    const body = await request.json()
    const displayName = body.legalName || body.displayName || existing.name

    const email = body.email || existing.email
    let profileId = existing.profileId

    if (email && (!existing.profileId || email !== existing.email)) {
      const existingProfile = await prisma.profile.findUnique({
        where: { email },
        include: { clientProfile: true },
      })

      if (existingProfile) {
        if (existingProfile.clientProfile && existingProfile.clientProfile.id !== id) {
          return Errors.VALIDATION('This email is already linked to another client portal account')
        }
        if (existingProfile.role === 'ADMIN' || existingProfile.role === 'TEAM_MEMBER') {
          return Errors.VALIDATION('This email is already registered as an admin or team member account')
        }
        // Link to this existing profile
        profileId = existingProfile.id
      } else if (existing.profileId) {
        // Update the existing linked profile's email
        await prisma.profile.update({
          where: { id: existing.profileId },
          data: {
            email,
            name: body.contactPerson || body.legalName || existing.contactPerson || existing.name || '',
          },
        })
      } else {
        // Create a new profile for this client
        const appUrl = getAppBaseUrl(request)
        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const authUserId = crypto.randomUUID()
        const inviteLink = `${appUrl}/auth/callback?token=${token}&email=${email}&next=/reset-password`

        await prisma.profile.create({
          data: {
            id: authUserId,
            email,
            role: 'CLIENT',
            name: body.contactPerson || body.legalName || existing.contactPerson || existing.name || '',
            phone: body.phone || existing.phone || null,
            isActive: true,
            invitedAt: new Date(),
            magicLinkToken: token,
            magicLinkExpires: expires,
          },
        })

        profileId = authUserId

        await sendClientInvite({
          to: email,
          name: body.contactPerson || body.legalName || existing.contactPerson || existing.name || 'Client',
          inviteLink,
        })

        await createNotification({
          userId: authUserId,
          title: 'Welcome to Tvita!',
          message: 'Your client portal account has been created. Set up your password to begin!',
          type: 'INFO',
        })
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: displayName,
        profileId: profileId || null,
        status: body.status || existing.status,
        onboardingStatus: body.onboardingStatus || existing.onboardingStatus,
        verificationStatus: body.verificationStatus || existing.verificationStatus,
        updatedById: user.id,
        clientType: body.clientType || existing.clientType,
        legalName: body.legalName ?? existing.legalName,
        displayName: body.displayName ?? existing.displayName,
        country: body.country ?? existing.country,
        stateProvince: body.stateProvince ?? existing.stateProvince,
        city: body.city ?? existing.city,
        timezone: body.timezone ?? existing.timezone,
        industry: body.industry ?? existing.industry,
        website: body.website ?? existing.website,
        contactPerson: body.contactPerson ?? existing.contactPerson,
        designation: body.designation ?? existing.designation,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        whatsapp: body.whatsapp ?? existing.whatsapp,
        preferredComm: body.preferredComm ?? existing.preferredComm,
        address: body.address ?? existing.address,
        registeredAddress: body.registeredAddress ?? existing.registeredAddress,
        billingCity: body.billingCity ?? existing.billingCity,
        billingState: body.billingState ?? existing.billingState,
        billingCountry: body.billingCountry ?? existing.billingCountry,
        postalCode: body.postalCode ?? existing.postalCode,
        entityType: body.entityType ?? existing.entityType,
        registrationNo: body.registrationNo ?? existing.registrationNo,
        countryOfRegistration: body.countryOfRegistration ?? existing.countryOfRegistration,
        taxId: body.taxId ?? existing.taxId,
        pan: body.pan ? String(body.pan).toUpperCase() : existing.pan,
        gstin: body.gstin ? String(body.gstin).toUpperCase() : existing.gstin,
        vatNumber: body.vatNumber ?? existing.vatNumber,
        authorizedRep: body.authorizedRep ?? existing.authorizedRep,
        billingName: body.billingName ?? existing.billingName,
        billingEmail: body.billingEmail ?? existing.billingEmail,
        currency: body.currency ?? existing.currency,
        taxApplicable: body.taxApplicable !== undefined ? (body.taxApplicable === true || body.taxApplicable === 'on') : existing.taxApplicable,
        taxRate: body.taxRate !== undefined ? (body.taxRate ? Number(body.taxRate) : null) : existing.taxRate,
        poRequired: body.poRequired !== undefined ? (body.poRequired === true || body.poRequired === 'on') : existing.poRequired,
        poNumber: body.poNumber ?? existing.poNumber,
        paymentTerms: body.paymentTerms ?? existing.paymentTerms,
        paymentMethod: body.paymentMethod ?? existing.paymentMethod,
        paymentReference: body.paymentReference ?? existing.paymentReference,
        paymentProvider: body.paymentProvider ?? existing.paymentProvider,
        paymentInstructions: body.paymentInstructions ?? existing.paymentInstructions,
        txnFeeResponsibility: body.txnFeeResponsibility ?? existing.txnFeeResponsibility,
        clientSource: body.clientSource ?? existing.clientSource,
        externalPlatformUrl: body.externalPlatformUrl !== undefined ? (body.externalPlatformUrl || null) : (existing as any).externalPlatformUrl,
        clientPriority: body.clientPriority ?? existing.clientPriority,
        accountManagerId: body.accountManagerId ?? existing.accountManagerId,
        internalTags: Array.isArray(body.internalTags) ? body.internalTags : (body.internalTags ? String(body.internalTags).split(',').map((t: string) => t.trim()) : existing.internalTags),
        internalNotes: body.internalNotes ?? existing.internalNotes,
        riskLevel: body.riskLevel ?? existing.riskLevel,
      },
    })

    // Cascade status changes if status changed
    if (body.status && body.status !== existing.status) {
      if (body.status === 'SUSPENDED' || body.status === 'INACTIVE') {
        await prisma.clientSubTeam.updateMany({
          where: { clientId: id },
          data: { status: body.status === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE' },
        })
      } else if (body.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
        await prisma.clientSubTeam.updateMany({
          where: { clientId: id, revokedByAdmin: false },
          data: { status: 'ACTIVE' },
        })
      }
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'UPDATE',
      entityType: 'client',
      entityId: id,
      entityLabel: existing.name,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: displayName, status: updated.status },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin client PUT API error:', error)
    return Errors.INTERNAL('Failed to update client')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { id } = await params

  try {
    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) {
      return Errors.NOT_FOUND('Client')
    }

    // Delete all projects linked to this client and their nested items
    const projects = await prisma.project.findMany({
      where: { clientId: id },
      select: { id: true }
    })
    const projectIds = projects.map(p => p.id)

    if (projectIds.length > 0) {
      await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.taskComment.deleteMany({ where: { task: { projectId: { in: projectIds } } } })
      await prisma.taskActivity.deleteMany({ where: { task: { projectId: { in: projectIds } } } })
      await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.projectUpdate.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.project.deleteMany({ where: { clientId: id } })
    }

    // Delete invoices and payments
    const invoices = await prisma.invoice.findMany({
      where: { clientId: id },
      select: { id: true }
    })
    const invoiceIds = invoices.map(i => i.id)
    if (invoiceIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
      await prisma.invoice.deleteMany({ where: { clientId: id } })
    }

    // Delete subscriptions and other client collections
    await prisma.subscription.deleteMany({ where: { clientId: id } })
    await prisma.clientContact.deleteMany({ where: { clientId: id } })

    // Find and delete the profile if the client had a portal login profile
    if (client.profileId) {
      try {
        const supabaseAdmin = createSupabaseAdminClient()
        await supabaseAdmin.auth.admin.deleteUser(client.profileId)
      } catch (err) {
        console.warn('Supabase delete user warning (might not exist in Supabase auth):', err)
      }
      await prisma.profile.delete({ where: { id: client.profileId } })
    }

    await prisma.client.delete({ where: { id } })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'DELETE',
      entityType: 'client',
      entityId: id,
      entityLabel: client.name,
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Admin client DELETE API error:', error)
    return Errors.INTERNAL('Failed to delete client')
  }
}
