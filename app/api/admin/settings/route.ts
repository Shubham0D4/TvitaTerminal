import { apiSuccess, Errors } from '@/shared/utilities/api-response'
import { getServerUser, isAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const settings = await prisma.appSettings.findFirst()
    return apiSuccess(settings)
  } catch (error) {
    console.error('Admin settings GET API error:', error)
    return Errors.INTERNAL('Failed to fetch app settings')
  }
}

export async function PUT(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !isAdmin(user)) {
    return Errors.UNAUTHORIZED()
  }

  try {
    const body = await request.json()
    const {
      companyName,
      companyAddress,
      companyEmail,
      companyPhone,
      companyGstin,
      companyPan,
      companyState,
      bankName,
      bankAccount,
      bankIfsc,
      bankBranch,
      invoicePrefix,
      invoiceFooter,
      currency,
      taxRate,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSender,
    } = body

    if (!companyName || !invoicePrefix) {
      return Errors.VALIDATION('companyName and invoicePrefix are required')
    }

    const existing = await prisma.appSettings.findFirst()

    let updated
    if (existing) {
      updated = await prisma.appSettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          companyAddress: companyAddress || null,
          companyEmail: companyEmail || null,
          companyPhone: companyPhone || null,
          companyGstin: companyGstin || null,
          companyPan: companyPan || null,
          companyState: companyState || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          bankIfsc: bankIfsc || null,
          bankBranch: bankBranch || null,
          invoicePrefix,
          invoiceFooter: invoiceFooter || null,
          currency: currency || 'INR',
          taxRate: taxRate !== undefined ? Number(taxRate) : 18,
          smtpHost: smtpHost !== undefined ? smtpHost : existing.smtpHost,
          smtpPort: smtpPort !== undefined && smtpPort !== '' ? Number(smtpPort) : null,
          smtpUser: smtpUser !== undefined ? smtpUser : existing.smtpUser,
          smtpPass: smtpPass !== undefined ? smtpPass : existing.smtpPass,
          smtpSender: smtpSender !== undefined ? smtpSender : existing.smtpSender,
        },
      })
    } else {
      updated = await prisma.appSettings.create({
        data: {
          companyName,
          companyAddress: companyAddress || null,
          companyEmail: companyEmail || null,
          companyPhone: companyPhone || null,
          companyGstin: companyGstin || null,
          companyPan: companyPan || null,
          companyState: companyState || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          bankIfsc: bankIfsc || null,
          bankBranch: bankBranch || null,
          invoicePrefix,
          invoiceFooter: invoiceFooter || null,
          currency: currency || 'INR',
          taxRate: taxRate !== undefined ? Number(taxRate) : 18,
          smtpHost: smtpHost || 'smtp.gmail.com',
          smtpPort: smtpPort ? Number(smtpPort) : 587,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpSender: smtpSender || null,
        },
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('Admin settings PUT API error:', error)
    return Errors.INTERNAL('Failed to update app settings')
  }
}
