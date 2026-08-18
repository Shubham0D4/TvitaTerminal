import { getServerUser, isAdmin, isClient } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePdfBuffer } from '@/lib/pdf/invoice-generator'
import { NextRequest, NextResponse } from 'next/server'

const STATE_CODE_MAP: Record<string, string> = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '37',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'LADAKH': '38',
}

function resolveStateCode(stateName?: string | null, gstin?: string | null): string {
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().substring(0, 2)
    if (/^\d{2}$/.test(code)) return code
  }
  if (!stateName) return '27'
  const upper = stateName.trim().toUpperCase()
  return STATE_CODE_MAP[upper] || '27'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id } = await params

  try {
    const [invoice, settings] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.appSettings.findFirst(),
    ])

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    // Permission check: Admin, assigned team, or owner client
    if (!isAdmin(user) && isClient(user)) {
      const client = await prisma.client.findFirst({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
      })
      if (!client || client.id !== invoice.clientId) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    const clientEmail = invoice.client.billingEmail || invoice.client.email || ''
    const supplierStateCode = settings?.companyStateCode || resolveStateCode(settings?.companyState, settings?.companyGstin)
    const clientStateCode = resolveStateCode(invoice.client.billingState || invoice.client.stateProvince, invoice.client.gstin)

    const subtotal = Number(invoice.subtotal)
    const discountAmount = Number(invoice.discountAmount || 0)
    const taxableAmount = Math.max(0, subtotal - discountAmount)

    const pdfBuffer = await generateInvoicePdfBuffer({
      invoiceNumber: invoice.invoiceNo,
      clientName: invoice.client.name,
      clientEmail,
      clientLegalName: invoice.client.legalName || undefined,
      clientAddress: invoice.client.registeredAddress || invoice.client.address || undefined,
      clientGstin: invoice.client.gstin || undefined,
      clientState: invoice.client.billingState || invoice.client.stateProvince || undefined,
      clientStateCode,
      date: invoice.issuedDate
        ? new Date(invoice.issuedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN'),
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : undefined,
      status: invoice.status,
      projectName: invoice.project?.name,
      projectId: invoice.project?.id,
      poNumber: invoice.poNumber || undefined,
      lineItems: (invoice.lineItems as any) || [],
      subtotal,
      discountAmount,
      taxableAmount,
      taxType: invoice.taxType,
      taxRate: Number(invoice.taxRate),
      cgstAmount: Number(invoice.cgstAmount),
      sgstAmount: Number(invoice.sgstAmount),
      igstAmount: Number(invoice.igstAmount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.amount),
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
      currency: invoice.currency || 'INR',
      placeOfSupply: invoice.placeOfSupply || undefined,
      reverseCharge: invoice.reverseCharge,
      notes: invoice.notes || undefined,
      // Supplier details from settings
      companyName: settings?.companyName || 'Tvita',
      companyEmail: settings?.companyEmail || 'billing@tvita.dev',
      companyPhone: settings?.companyPhone || undefined,
      companyAddress: settings?.companyAddress || undefined,
      companyGstin: settings?.companyGstin || undefined,
      companyPan: settings?.companyPan || undefined,
      companyState: settings?.companyState || undefined,
      companyStateCode: supplierStateCode,
      bankName: settings?.bankName || undefined,
      bankAccount: settings?.bankAccount || undefined,
      bankIfsc: settings?.bankIfsc || undefined,
      bankBranch: settings?.bankBranch || undefined,
      bankUpiId: settings?.bankUpiId || undefined,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNo}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[API /api/invoices/[id]/pdf Error]:', error)
    return new NextResponse('Failed to generate PDF invoice', { status: 500 })
  }
}
