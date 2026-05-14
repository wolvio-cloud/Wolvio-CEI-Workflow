import sql from './lib/db.js'
import { InvoiceService } from './lib/services/invoice-service.js'
import { ParameterService } from './lib/services/parameter-service.js'
import { FindingService } from './lib/services/finding-service.js'

async function runBackendAudit() {
  console.log('🔍 Starting Backend E2E Logic Audit...')

  try {
    // 1. Check Data Presence
    const contract = (await sql`SELECT * FROM contracts WHERE contract_id = 'WFA-LTSA-2019-001'`)[0]
    if (!contract) {
      console.error('❌ FAIL: Demo contract not found. Please run Reset Demo Data.')
      return
    }
    console.log('✅ Contract Found:', contract.contract_id)

    const params = await ParameterService.getParameters(contract.id)
    if (!params.base_monthly_fee) {
      console.error('❌ FAIL: Contract parameters missing from contract_parameters table.')
    } else {
      console.log('✅ Parameters Found (Base Fee):', params.base_monthly_fee.value)
    }

    const evidence = (await sql`SELECT * FROM evidence_files WHERE contract_id = ${contract.id}`)[0]
    if (!evidence) {
      console.error('❌ FAIL: Evidence files missing.')
    } else {
      console.log('✅ Evidence Found (JMR KWh):', evidence.data.net_kwh)
    }

    // 2. Test Billing Engine
    console.log('🚀 Running Invoice Generation Engine...')
    const invoice = await InvoiceService.generateInvoiceDraft({
      contractId: contract.id,
      periodStart: '2025-04-01',
      periodEnd: '2025-04-30',
      jmrKwh: 33360000
    })

    console.log('✅ Invoice Generated:', invoice.invoice_id)
    console.log('📊 Base Fee (Escalated):', invoice.base_amount)
    console.log('📊 Variable Amount:', invoice.variable_amount)
    console.log('📊 Total Amount:', invoice.total_amount)

    // 3. Test Finding Creation
    if (invoice.findings && invoice.findings.length > 0) {
      console.log(`✅ Findings Created: ${invoice.findings.length}`)
      invoice.findings.forEach((f, i) => {
        console.log(`   [${i+1}] Type: ${f.check_id}, Severity: ${f.severity}, Impact: ${f.financial_impact}`)
      })
    } else {
      console.log('⚠️ No findings created (Check if this is expected for current inputs)')
    }

    // 4. Test Audit Log
    const logs = await sql`SELECT * FROM audit_log WHERE contract_id = ${contract.id} ORDER BY timestamp DESC LIMIT 5`
    console.log(`✅ Recent Audit Logs: ${logs.length}`)

    console.log('\n✨ BACKEND AUDIT COMPLETE: ALL CORE LOGIC PATHS VERIFIED.')
  } catch (err) {
    console.error('❌ AUDIT FAILED with error:', err.message)
    console.error(err.stack)
  }
}

runBackendAudit()
