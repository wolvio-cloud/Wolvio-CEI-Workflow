import sql from '@/lib/db'
import { calculateContractualAvailability } from '@/lib/validation/engine'
import { anthropic, callClaude } from '@/lib/extraction/claude'

export async function POST(request: Request) {
  try {
    const { contract_id, period_start, period_end, evidence_data } = await request.json()

    // 1. Get contract and parameters
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${contract_id}`)[0]
    if (!contract) return Response.json({ error: 'Contract not found' }, { status: 404 })
    
    const params = contract.parameters

    // 2. Run Availability Math
    const result = calculateContractualAvailability({
      totalContractHours: evidence_data.total_hours,
      rawUnavailableHours: evidence_data.total_hours - evidence_data.scada_raw_available_hours,
      curtailmentHours: evidence_data.sldc_curtailment_hours,
      plannedMaintenanceHours: evidence_data.planned_maintenance_hours,
      overlapHours: evidence_data.overlap_hours,
      guaranteePct: params.availability_guarantee.value.percentage,
      ldRatePerPp: params.ld_formula.value.rate_per_pp * 100, // Convert 0.005 to 0.5
      ldCapPct: params.ld_formula.value.cap_pct,
      annualFee: params.base_annual_fee.value
    })

    // 3. Claude for finding explanation
    const opsExplanation = await callClaude({
      systemPrompt: "You are an Operations Manager. Explain an availability finding based on SCADA and SLDC data.",
      userMessage: `Explain this finding:\n${JSON.stringify({
        period: `${period_start} to ${period_end}`,
        result,
        methodology: params.availability_methodology.source_text
      })}`
    })

    // 4. Create Finding
    const [finding] = await sql`
      INSERT INTO findings (
        contract_id, check_id, verdict, expected_amount, actual_amount, gap_amount,
        formula, clause_reference, page_number, evidence_used, plain_english_fc, recommended_action, status
      ) VALUES (
        ${contract_id}, 'AVAILABILITY_CHECK', ${result.status === 'clean' ? 'CLEAN' : 'LD_EXPOSURE'},
        ${result.ldExposure}, 0, ${result.finalLd},
        ${params.availability_methodology.value.formula}, ${params.availability_methodology.clause_reference},
        ${params.availability_methodology.page_number}, ${JSON.stringify(evidence_data)},
        ${opsExplanation}, ${result.status === 'ld_exposure' ? 'Issue LD Notice' : 'None'}, 'pending'
      ) RETURNING *
    `

    // 5. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, finding_id, actor, action)
      VALUES ('AVAILABILITY_CHECKED', ${contract_id}, ${finding.id}, 'SYSTEM', 'Availability validated against SCADA and SLDC')
    `

    return Response.json(finding)

  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
