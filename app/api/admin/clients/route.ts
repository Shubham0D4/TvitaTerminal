import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { writeAuditLog } from '@/lib/audit'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { sendClientInvite } from '@/infrastructure/email'
import { createNotification } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/infrastructure/supabase/server'
import { getAppBaseUrl } from '@/shared/utilities/url'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''

  try {
    const where: any = {}
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { legalName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (status) {
      where.status = status
    }

    const [clients, totalCount, activeCount, suspendedCount] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { name: true, email: true } },
          _count: { select: { projects: true, invoices: true, subTeams: true } },
        },
      }),
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'SUSPENDED' } }),
    ])

    return apiSuccess({
      clients,
      stats: {
        totalCount,
        activeCount,
        suspendedCount,
      },
    })
  } catch (error) {
    console.error('Admin clients GET API error:', error)
    return Errors.INTERNAL('Failed to fetch clients')
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const loginEmail = body.email

    if (!body.legalName || !body.country || !body.email || !body.contactPerson || !body.address || !body.billingName || !body.billingEmail) {
      return Errors.VALIDATION('Required fields are missing: legalName, country, email, contactPerson, address, billingName, billingEmail')
    }

    let profileId: string | undefined

    if (loginEmail) {
      const supabaseAdmin = createSupabaseAdminClient()
      const appUrl = getAppBaseUrl(request)

      let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: loginEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
          data: { role: 'CLIENT', name: body.contactPerson || body.legalName },
        },
      })

      if (linkError || !linkData?.user) {
        const fallback = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: loginEmail,
          options: {
            redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
          },
        })
        linkData = fallback.data
        linkError = fallback.error
      }

      if (linkError || !linkData?.user) {
        console.error('Magic link error:', linkError)
        return Errors.VALIDATION(`Could not create invite: ${linkError?.message}`)
      }

      const authUserId = linkData.user.id
      const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`

      await prisma.profile.upsert({
        where: { email: loginEmail },
        update: { id: authUserId, role: 'CLIENT', name: body.contactPerson || body.legalName || '', isActive: true, invitedAt: new Date() },
        create: {
          id: authUserId,
          email: loginEmail,
          role: 'CLIENT',
          name: body.contactPerson || body.legalName || '',
          phone: body.phone || null,
          isActive: true,
          invitedAt: new Date(),
        },
      })
      profileId = authUserId

      await sendClientInvite({
        to: loginEmail,
        name: body.contactPerson || body.legalName || 'Client',
        inviteLink,
      })

      await createNotification({
        userId: authUserId,
        title: 'Welcome to Tvita!',
        message: 'Your client portal account has been created. Set up your password to begin!',
        type: 'INFO',
      })
    }

    const displayName = body.legalName || body.displayName || ''

    const newClient = await prisma.client.create({
      data: {
        name: displayName,
        status: body.status || 'ACTIVE',
        onboardingStatus: body.onboardingStatus || 'PENDING',
        verificationStatus: body.verificationStatus || 'UNVERIFIED',
        profileId: profileId || null,
        createdById: user.id,
        clientType: body.clientType || 'ORGANIZATION',
        legalName: body.legalName,
        displayName: body.displayName || null,
        country: body.country || null,
        stateProvince: body.stateProvince || null,
        city: body.city || null,
        timezone: body.timezone || null,
        industry: body.industry || null,
        website: body.website || null,
        contactPerson: body.contactPerson || null,
        designation: body.designation || null,
        email: body.email || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        preferredComm: body.preferredComm || null,
        address: body.address || null,
        registeredAddress: body.registeredAddress || null,
        billingCity: body.billingCity || null,
        billingState: body.billingState || null,
        billingCountry: body.billingCountry || null,
        postalCode: body.postalCode || null,
        entityType: body.entityType || null,
        registrationNo: body.registrationNo || null,
        countryOfRegistration: body.countryOfRegistration || null,
        taxId: body.taxId || null,
        pan: body.pan ? String(body.pan).toUpperCase() : null,
        gstin: body.gstin ? String(body.gstin).toUpperCase() : null,
        vatNumber: body.vatNumber || null,
        authorizedRep: body.authorizedRep || null,
        billingName: body.billingName || null,
        billingEmail: body.billingEmail || null,
        currency: body.currency || 'INR',
        taxApplicable: body.taxApplicable === true || body.taxApplicable === 'on',
        taxRate: body.taxRate ? Number(body.taxRate) : null,
        poRequired: body.poRequired === true || body.poRequired === 'on',
        poNumber: body.poNumber || null,
        paymentTerms: body.paymentTerms || null,
        paymentMethod: body.paymentMethod || null,
        paymentReference: body.paymentReference || null,
        paymentProvider: body.paymentProvider || null,
        paymentInstructions: body.paymentInstructions || null,
        txnFeeResponsibility: body.txnFeeResponsibility || null,
        clientSource: body.clientSource || null,
        clientPriority: body.clientPriority || 'MEDIUM',
        accountManagerId: body.accountManagerId || null,
        internalTags: Array.isArray(body.internalTags) ? body.internalTags : (body.internalTags ? String(body.internalTags).split(',').map((t: string) => t.trim()) : []),
        internalNotes: body.internalNotes || null,
        riskLevel: body.riskLevel || 'LOW',
      },
    })

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CREATE',
      entityType: 'client',
      entityId: newClient.id,
      entityLabel: newClient.name,
      newValue: { name: newClient.name, status: newClient.status, country: newClient.country },
    })

    return apiSuccess(newClient, 201)
  } catch (error) {
    console.error('Admin clients POST API error:', error)
    return Errors.INTERNAL('Failed to create client')
  }
}
