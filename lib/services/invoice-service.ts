import sql from '@/lib/db'
import { 
  calculateWPIEscalation, 
  calculateVariableComponent, 
  calculateInvoiceTotal, 
  calculateTrendVariance,
  InvoiceLineItems
} from '@/lib/validation/engine'
import { callClaude } from '@/lib/extraction/claude'
import { INVOICE_CONFIDENCE_PROMPT } from '@/lib/extraction/contract-prompt'

export interface InvoiceGenerationParams {
  contractId: string
  periodStart: string
  periodEnd: string
  jmrKwh: number
}

export class InvoiceService {
  /**
   * Generates a deterministic invoice draft based on contract rules and SCADA/JMR data.
   */
  static async generateInvoiceDraft(params: InvoiceGenerationParams) {
    // 1. Fetch Contract & Parameters
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${params.contractId}`)[0]
    if (!contract) throw new Error('Contract not found')
    
    const contractParams = contract.parameters
    
    // 2. Fetch Supporting Data (WPI)
    const wpiData = await sql`SELECT year, value FROM wpi_index`
    
    // 3. Financial Logic Orchestration
    const wpiResult = calculateWPIEscalation({
      baseMonthlyFee: contractParams.base_monthly_fee.value,
      wpiBaseYear: contractParams.wpi_escalation.value.base_year,
      wpiCurrentYear: new Date(params.periodStart).getFullYear(),
      wpiData: wpiData.map((d: any) => ({ year: d.year, value: parseFloat(d.value) })),
      capPct: contractParams.wpi_escalation.value.cap_pct,
      floorPct: contractParams.wpi_escalation.value.floor_pct
    })

    const varResult = calculateVariableComponent({
      netKwh: params.jmrKwh,
      ratePerKwh: contractParams.variable_rate.value.rate_per_kwh
    })

    const invResult = calculateInvoiceTotal({
      baseFeeAfterEscalation: wpiResult.escalatedFee,
      variableAmount: varResult.variableAmount,
      gstRate: contractParams.gst_treatment.value.rate_pct,
      invoiceDate: new Date(),
      paymentTermsDays: contractParams.payment_terms.value.net_days
    })

    // 4. Historical Trend Analysis
    const lastInvRow = (await sql`
      SELECT total_amount as total, base_amount as "baseFee", variable_amount as "variableAmount", tax_amount as "gstAmount"
      FROM invoices 
      WHERE contract_id = ${params.contractId} AND status = 'approved' 
      ORDER BY period_start DESC LIMIT 1
    `)[0]

    let varianceReport = null
    if (lastInvRow) {
      varianceReport = calculateTrendVariance({
        currentInvoice: {
          baseFee: invResult.subtotal - varResult.variableAmount,
          variableAmount: varResult.variableAmount,
          gstAmount: invResult.gstAmount,
          total: invResult.total
        },
        previousInvoice: lastInvRow,
        wpiEscalationApplied: wpiResult.escalationAmount > 0,
        wpiEscalationAmount: wpiResult.escalationAmount,
        variableChangeDelta: varResult.variableAmount - lastInvRow.variableAmount
      })
    }

    // 5. AI Confidence Contextualization
    const confidenceExplanation = await callClaude({
      systemPrompt: INVOICE_CONFIDENCE_PROMPT,
      userMessage: `Analyze variance for ${params.periodStart}:\n${JSON.stringify({
        current: { wpi: wpiResult, variable: varResult, variance: varianceReport },
        historical: lastInvRow
      })}`
    })

    // 6. Persistence
    const invoiceId = `INV-${contract.contract_id}-${params.periodStart.substring(0, 7)}`
    
    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_id, contract_id, period_start, period_end, 
        base_amount, variable_amount, tax_amount, total_amount,
        due_date, status, source, calculation_evidence, confidence_explanation
      ) VALUES (
        ${invoiceId}, ${params.contractId}, ${params.periodStart}, ${params.periodEnd},
        ${invResult.subtotal - varResult.variableAmount}, ${varResult.variableAmount}, 
        ${invResult.gstAmount}, ${invResult.total},
        ${invResult.dueDate}, 'draft', 'internal',
        ${sql.json({ wpiResult, varResult, invResult, varianceReport })},
        ${confidenceExplanation}
      ) ON CONFLICT (invoice_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        calculation_evidence = EXCLUDED.calculation_evidence
      RETURNING *
    `

    // 7. Audit Logging
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, action)
      VALUES ('INVOICE_GENERATED', ${params.contractId}, ${invoice.id}, 'SYSTEM', 'Generated draft invoice via Math Engine')
    `

    return invoice
  }

  static async getInvoiceDetails(id: string) {
    const invoice = (await sql`
      SELECT i.*, c.customer_name, c.display_name, c.contract_id as external_contract_id
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      WHERE i.id = ${id}
    `)[0]
    return invoice
  }

  static async approveInvoice(id: string, actor: string = 'Finance Controller') {
    return await sql.begin(async (tx: any) => {
      const invoice = (await tx`SELECT * FROM invoices WHERE id = ${id}`)[0]
      if (!invoice) throw new Error('Invoice not found')

      await tx`UPDATE invoices SET status = 'approved' WHERE id = ${id}`
      
      await tx`
        INSERT INTO approvals (invoice_id, actor, role, action, comments)
        VALUES (${id}, ${actor}, 'FC', 'APPROVE', 'Deterministically verified by CEI Engine')
      `

      await tx`
        INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, action)
        VALUES ('INVOICE_APPROVED', ${invoice.contract_id}, ${id}, ${actor}, 'Manually approved invoice draft')
      `
      
      return { success: true }
    })
  }
}
