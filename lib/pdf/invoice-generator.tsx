import React from 'react'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  brandSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  taxInvoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 1,
  },
  metaText: {
    fontSize: 8,
    color: '#475569',
    marginTop: 3,
  },
  badgePaid: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgePending: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeOverdue: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeDefault: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  twoColSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  addressBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 8.5,
    color: '#334155',
    marginBottom: 2,
  },
  projectBanner: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  projectMeta: {
    fontSize: 8,
    color: '#3b82f6',
  },
  table: {
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 6,
    borderRadius: 3,
  },
  tableHeaderColDesc: { width: '45%', fontSize: 8, fontWeight: 'bold', color: '#ffffff' },
  tableHeaderColSac: { width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  tableHeaderColQty: { width: '10%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  tableHeaderColRate: { width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' },
  tableHeaderColAmt: { width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid',
    padding: 6,
    alignItems: 'center',
  },
  colDesc: { width: '45%', fontSize: 8.5, color: '#0f172a' },
  colSac: { width: '15%', fontSize: 8, color: '#64748b', textAlign: 'center' },
  colQty: { width: '10%', fontSize: 8.5, color: '#0f172a', textAlign: 'center' },
  colRate: { width: '15%', fontSize: 8.5, color: '#0f172a', textAlign: 'right' },
  colAmt: { width: '15%', fontSize: 8.5, fontWeight: 'bold', color: '#0f172a', textAlign: 'right' },
  bottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  leftPaymentBox: {
    width: '52%',
  },
  rightTotalsBox: {
    width: '44%',
  },
  bankCard: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 8,
    color: '#334155',
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 8.5,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  balanceLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  balanceValue: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  gstDeclarations: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  declarationText: {
    fontSize: 7.5,
    color: '#475569',
  },
  notesBox: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#4f46e5',
  },
  notesText: {
    fontSize: 7.5,
    color: '#64748b',
  },
  signatorySection: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  computerNotice: {
    fontSize: 7,
    color: '#94a3b8',
    fontStyle: 'italic',
    width: '60%',
  },
  signatoryBox: {
    width: '35%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
  },
  signatoryText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#334155',
  },
})

export interface InvoiceLineItem {
  description: string
  sacCode?: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoicePdfData {
  invoiceNumber: string
  clientName: string
  clientEmail: string
  clientLegalName?: string
  clientAddress?: string
  clientGstin?: string
  clientState?: string
  clientStateCode?: string
  date: string
  dueDate?: string
  status?: string
  stripePaymentId?: string
  planName?: string
  billingCycle?: string
  projectName?: string
  projectId?: string
  poNumber?: string
  lineItems?: InvoiceLineItem[]
  subtotal: number
  discountAmount?: number
  taxableAmount?: number
  taxType?: 'INTRA_STATE' | 'INTER_STATE' | 'EXPORT' | string
  taxRate?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  taxAmount: number
  totalAmount: number
  amountPaid?: number
  amountDue?: number
  currency: string
  notes?: string
  placeOfSupply?: string
  reverseCharge?: boolean
  // Supplier details
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyAddress?: string
  companyGstin?: string
  companyPan?: string
  companyState?: string
  companyStateCode?: string
  bankName?: string
  bankAccount?: string
  bankIfsc?: string
  bankBranch?: string
  bankUpiId?: string
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const currencySymbol = data.currency === 'INR' ? '₹' : data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : `${data.currency} `
  const status = (data.status || 'PENDING').toUpperCase()

  const subtotal = Number(data.subtotal || 0)
  const discount = Number(data.discountAmount || 0)
  const taxable = data.taxableAmount !== undefined ? Number(data.taxableAmount) : Math.max(0, subtotal - discount)
  const totalTax = Number(data.taxAmount || 0)
  const total = Number(data.totalAmount || 0)
  const paid = status === 'PAID' ? total : Number(data.amountPaid || 0)
  const due = Math.max(0, total - paid)

  const taxType = data.taxType || (data.cgstAmount && data.cgstAmount > 0 ? 'INTRA_STATE' : data.igstAmount && data.igstAmount > 0 ? 'INTER_STATE' : 'EXPORT')
  const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : 18

  const getStatusBadge = () => {
    if (status === 'PAID') return <Text style={styles.badgePaid}>STATUS: PAID</Text>
    if (status === 'PENDING') return <Text style={styles.badgePending}>STATUS: DUE / PENDING</Text>
    if (status === 'OVERDUE') return <Text style={styles.badgeOverdue}>STATUS: OVERDUE</Text>
    return <Text style={styles.badgeDefault}>STATUS: {status}</Text>
  }

  const items: InvoiceLineItem[] =
    data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [
          {
            description: 'Software & Technology Consulting Services',
            sacCode: '998314',
            quantity: 1,
            rate: subtotal,
            amount: subtotal,
          },
        ]

  const formatCurr = (val: number) => `${currencySymbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Document title={`Tax-Invoice-${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* 1. Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{data.companyName || 'TVITA'}</Text>
            <Text style={styles.brandSub}>Enterprise Platform & Digital Solutions</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.metaText}>Invoice #: {data.invoiceNumber}</Text>
            <Text style={styles.metaText}>Issued: {data.date}</Text>
            {data.dueDate && <Text style={styles.metaText}>Due Date: {data.dueDate}</Text>}
            {getStatusBadge()}
          </View>
        </View>

        {/* 2 & 3. From / Supplier & Bill To / Client */}
        <View style={styles.twoColSection}>
          <View style={styles.addressBox}>
            <Text style={styles.sectionHeading}>1. Supplier Details (From)</Text>
            <Text style={styles.partyName}>{data.companyName || 'Tvita'}</Text>
            {data.companyAddress && <Text style={styles.addressLine}>{data.companyAddress}</Text>}
            {data.companyGstin && <Text style={styles.addressLine}>GSTIN: {data.companyGstin}</Text>}
            {data.companyPan && <Text style={styles.addressLine}>PAN: {data.companyPan}</Text>}
            {data.companyEmail && <Text style={styles.addressLine}>Email: {data.companyEmail}</Text>}
            {data.companyPhone && <Text style={styles.addressLine}>Phone: {data.companyPhone}</Text>}
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.sectionHeading}>2. Recipient Details (Bill To)</Text>
            <Text style={styles.partyName}>{data.clientLegalName || data.clientName}</Text>
            {data.clientAddress && <Text style={styles.addressLine}>{data.clientAddress}</Text>}
            {data.clientGstin ? (
              <Text style={styles.addressLine}>GSTIN: {data.clientGstin}</Text>
            ) : (
              <Text style={styles.addressLine}>GSTIN: Unregistered / Overseas</Text>
            )}
            {data.clientEmail && <Text style={styles.addressLine}>Billing Email: {data.clientEmail}</Text>}
            {data.clientState && <Text style={styles.addressLine}>State: {data.clientState} {data.clientStateCode ? `(${data.clientStateCode})` : ''}</Text>}
          </View>
        </View>

        {/* 4. Project Reference */}
        {(data.projectName || data.poNumber) && (
          <View style={styles.projectBanner}>
            <Text style={styles.projectTitle}>
              PROJECT: {data.projectName || 'General Billing'}{' '}
              {data.projectId ? `(ID: ${data.projectId.substring(0, 8)})` : ''}
            </Text>
            {data.poNumber && <Text style={styles.projectMeta}>PO / Contract #: {data.poNumber}</Text>}
          </View>
        )}

        {/* 5. Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderColDesc}>Description</Text>
            <Text style={styles.tableHeaderColSac}>SAC / HSN</Text>
            <Text style={styles.tableHeaderColQty}>Qty</Text>
            <Text style={styles.tableHeaderColRate}>Rate ({currencySymbol})</Text>
            <Text style={styles.tableHeaderColAmt}>Amount ({currencySymbol})</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colSac}>{item.sacCode || '998314'}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.colAmt}>{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          ))}
        </View>

        {/* 6 & 7 & 8. Bottom Grid: Payment Info on left, Tax & Amounts on right */}
        <View style={styles.bottomGrid}>
          <View style={styles.leftPaymentBox}>
            <View style={styles.bankCard}>
              <Text style={styles.cardTitle}>Payment Instructions & Banking</Text>
              {data.bankName && <Text style={styles.cardText}>Bank Name: {data.bankName}</Text>}
              {data.bankAccount && <Text style={styles.cardText}>Account No: {data.bankAccount}</Text>}
              {data.bankIfsc && <Text style={styles.cardText}>IFSC Code: {data.bankIfsc}</Text>}
              {data.bankBranch && <Text style={styles.cardText}>Branch: {data.bankBranch}</Text>}
              {data.bankUpiId && <Text style={styles.cardText}>UPI / VPA ID: {data.bankUpiId}</Text>}
            </View>

            <View style={styles.gstDeclarations}>
              <Text style={styles.declarationText}>
                Place of Supply: {data.placeOfSupply || 'Maharashtra — 27'}
              </Text>
              <Text style={styles.declarationText}>
                Reverse Charge: {data.reverseCharge ? 'Yes' : 'No'}
              </Text>
            </View>

            {data.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.cardTitle}>Notes & Terms</Text>
                <Text style={styles.notesText}>{data.notes}</Text>
              </View>
            )}
          </View>

          <View style={styles.rightTotalsBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurr(subtotal)}</Text>
            </View>

            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={styles.summaryValue}>-{formatCurr(discount)}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxable Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurr(taxable)}</Text>
            </View>

            {taxType === 'INTRA_STATE' && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>CGST @ {(taxRate / 2).toFixed(1)}%:</Text>
                  <Text style={styles.summaryValue}>{formatCurr(data.cgstAmount || totalTax / 2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>SGST @ {(taxRate / 2).toFixed(1)}%:</Text>
                  <Text style={styles.summaryValue}>{formatCurr(data.sgstAmount || totalTax / 2)}</Text>
                </View>
              </>
            )}

            {taxType === 'INTER_STATE' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST @ {taxRate}%:</Text>
                <Text style={styles.summaryValue}>{formatCurr(data.igstAmount || totalTax)}</Text>
              </View>
            )}

            {taxType === 'EXPORT' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (Export / 0%):</Text>
                <Text style={styles.summaryValue}>{formatCurr(0)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL INVOICE:</Text>
              <Text style={styles.totalValue}>{formatCurr(total)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid:</Text>
              <Text style={styles.summaryValue}>{formatCurr(paid)}</Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>AMOUNT DUE:</Text>
              <Text style={styles.balanceValue}>{formatCurr(due)}</Text>
            </View>
          </View>
        </View>

        {/* Signatory Footer */}
        <View style={styles.signatorySection}>
          <Text style={styles.computerNotice}>
            This is an official computer-generated Tax Invoice issued under Indian GST regulations. No physical signature is required.
          </Text>
          <View style={styles.signatoryBox}>
            <Text style={styles.signatoryText}>Authorized Signatory</Text>
            <Text style={{ fontSize: 7, color: '#64748b', marginTop: 2 }}>{data.companyName || 'Tvita'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const element = <InvoiceDocument data={data} />
  const buffer = await renderToBuffer(element)
  return buffer
}
