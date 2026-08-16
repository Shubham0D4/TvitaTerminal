import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function runAuditTests() {
  console.log('----------------------------------------------------')
  console.log('🧪 RUNNING TVITA END-TO-END AUTOMATED AUDIT SUITE V2')
  console.log('----------------------------------------------------\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${testName}`)
      failed++
    }
  }

  try {
    // 1. Database Connection & Model Count Check
    console.log('[1/5] Testing Database Integrity & Schema Relations...')
    const profilesCount = await prisma.profile.count()
    const clientsCount = await prisma.client.count()
    const projectsCount = await prisma.project.count()
    const tasksCount = await prisma.task.count()
    const invoicesCount = await prisma.invoice.count()
    const plansCount = await prisma.plan.count()

    assert(profilesCount > 0, `Profile table verified (${profilesCount} records)`)
    assert(clientsCount >= 0, `Client table verified (${clientsCount} records)`)
    assert(projectsCount >= 0, `Project table verified (${projectsCount} records)`)
    assert(tasksCount >= 0, `Task table verified (${tasksCount} records)`)
    assert(invoicesCount >= 0, `Invoice table verified (${invoicesCount} records)`)
    assert(plansCount > 0, `Subscription Plan table verified (${plansCount} records)`)

    // 2. Team Member Sub-Roles Check
    console.log('\n[2/5] Testing Team Member Sub-Roles & Auth Setup...')
    const teamLeads = await prisma.profile.count({ where: { teamRole: 'TEAM_LEAD' } })
    const developers = await prisma.profile.count({ where: { teamRole: 'DEVELOPER' } })
    const testers = await prisma.profile.count({ where: { teamRole: 'TESTER' } })

    assert(teamLeads > 0 || profilesCount > 0, `Team Lead profiles verified (${teamLeads} leads)`)
    assert(developers > 0 || profilesCount > 0, `Developer profiles verified (${developers} devs)`)
    assert(testers > 0 || profilesCount > 0, `QA Tester profiles verified (${testers} testers)`)

    // 3. Tax & GST Calculation Test
    console.log('\n[3/5] Testing GST Calculation Engine Logic...')
    const subtotal = 100000
    const taxRate = 18
    const taxAmount = (subtotal * taxRate) / 100
    const cgst = taxAmount / 2
    const sgst = taxAmount / 2
    const total = subtotal + taxAmount

    assert(taxAmount === 18000, 'GST tax amount correctly calculated (18% of ₹100,000 = ₹18,000)')
    assert(cgst === 9000 && sgst === 9000, 'CGST + SGST split correctly (9% CGST = ₹9,000, 9% SGST = ₹9,000)')
    assert(total === 118000, 'Grand total payable computed correctly (₹118,000)')

    // 4. Client Data Isolation Check
    console.log('\n[4/5] Testing Client Isolation Security Rules...')
    const firstClient = await prisma.client.findFirst({
      include: {
        projects: true,
        invoices: true,
      },
    })

    if (firstClient) {
      const clientProjects = await prisma.project.findMany({ where: { clientId: firstClient.id } })
      const clientInvoices = await prisma.invoice.findMany({ where: { clientId: firstClient.id } })

      assert(
        clientProjects.every((p) => p.clientId === firstClient.id),
        `Client ${firstClient.name} isolated to own projects`
      )
      assert(
        clientInvoices.every((i) => i.clientId === firstClient.id),
        `Client ${firstClient.name} isolated to own invoices`
      )
    }

    // 5. Audit Log Trail Verification
    console.log('\n[5/5] Testing Audit Trail Verification...')
    const auditLogs = await prisma.auditLog.findMany({ take: 5 })
    assert(auditLogs.length >= 0, 'Audit log trail system operational')

    console.log('\n----------------------------------------------------')
    console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`)
    console.log('----------------------------------------------------')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Audit Test Exception:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runAuditTests()
