import sql from '@/lib/db'
import { 
  calculateWPIEscalation, 
  calculateVariableComponent, 
  calculateInvoiceTotal, 
  calculateTrendVariance 
} from '@/lib/validation/engine'
import { anthropic } from '@/lib/extraction/claude'
import { INVOICE_CONFIDENCE_PROMPT } from '@/lib/extraction/contract-prompt'

export async function POST(request: Request) {
  try {
    const { contract_id, period_start, period_end, jmr_kwh } = await request.json()

    // 1. Get contract and parameters
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${contract_id}`)[0]
    if (!contract) return Response.json({ error: 'Contract not found' }, { status: 404 })
    
    const params = contract.parameters
    
    // 2. Get WPI data
    const wpiData = await sql`SELECT year, value FROM wpi_index`
    
    // 3. Math Engine Calculations
    const wpiResult = calculateWPIEscalation({
      baseMonthlyFee: params.base_monthly_fee.value,
      wpiBaseYear: params.wpi_escalation.value.base_year,
      wpiCurrentYear: new Date(period_start).getFullYear(),
      wpiData: wpiData.map(d => ({ year: d.year, value: parseFloat(d.value) })),
      capPct: params.wpi_escalation.value.cap_pct,
      floorPct: params.wpi_escalation.value.floor_pct
    })

    const varResult = calculateVariableComponent({
      netKwh: jmr_kwh,
      ratePerKwh: params.variable_rate.value.rate_per_kwh
    })

    const invResult = calculateInvoiceTotal({
      baseFeeAfterEscalation: wpiResult.escalatedFee,
      variableAmount: varResult.variableAmount,
      gstRate: params.gst_treatment.value.rate_pct,
      invoiceDate: new Date(),
      paymentTermsDays: params.payment_terms.value.net_days
    })

    // 4. Trend Variance against last historical invoice
    const lastInv = (await sql`
      SELECT * FROM historical_invoices 
      WHERE contract_id = ${contract_id} 
      ORDER BY period_end DESC LIMIT 1
    `)[0]

    let varianceReport = null
    if (lastInv) {
      varianceReport = calculateTrendVariance({
        currentInvoice: {
          baseFee: wpiResult.escalatedFee,
          variableAmount: varResult.variableAmount,
          gstAmount: invResult.gstAmount,
          total: invResult.total
        },
        previousInvoice: {
          baseFee: parseFloat(lastInv.base_fee),
          variableAmount: parseFloat(lastInv.variable_amount),
          gstAmount: parseFloat(lastInv.gst_amount),
          total: parseFloat(lastInv.total)
        },
        wpiEscalationApplied: wpiResult.escalationAmount > 0,
        wpiEscalationAmount: wpiResult.escalationAmount,
        variableChangeDelta: varResult.variableAmount - parseFloat(lastInv.variable_amount)
      })
    }

    // 5. Claude for confidence explanation
    const claudeResp = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: INVOICE_CONFIDENCE_PROMPT,
      messages: [{ 
        role: 'user', 
        content: `Explain confidence for this invoice draft:\n${JSON.stringify({
          period: `${period_start} to ${period_end}`,
          wpi: wpiResult,
          variable: varResult,
          variance: varianceReport
        })}` 
      }]
    })

    const confidenceExplanation = (claudeResp.content[0] as any).text

    // 6. Save Draft
    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_id, contract_id, period_start, period_end, base_fee, 
        escalation_amount, variable_amount, subtotal, gst_amount, total, 
        invoice_date, due_date, status, confidence_score, confidence_report
      ) VALUES (
        ${`DRAFT-${Date.now()}`}, ${contract_id}, ${period_start}, ${period_end}, 
        ${wpiResult.escalatedFee}, ${wpiResult.escalationAmount}, ${varResult.variableAmount}, 
        ${invResult.subtotal}, ${invResult.gstAmount}, ${invResult.total}, 
        ${new Date()}, ${invResult.dueDate}, 'draft', ${varianceReport?.confidenceStatus || 'ready'},
        ${JSON.stringify({ explanation: confidenceExplanation, variance: varianceReport, wpi: wpiResult })}
      ) RETURNING *
    `

    // 7. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, action)
      VALUES ('INVOICE_GENERATED', ${contract_id}, ${invoice.id}, 'SYSTEM', 'Generated draft invoice via Math Engine')
    `

    return Response.json(invoice)

  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
