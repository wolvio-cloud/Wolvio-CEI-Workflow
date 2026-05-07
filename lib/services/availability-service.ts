import sql from '@/lib/db'
import { calculateContractualAvailability } from '@/lib/validation/engine'
import { callClaude } from '@/lib/extraction/claude'
import { AVAILABILITY_EXPLANATION_PROMPT } from '@/lib/extraction/contract-prompt'

export interface AvailabilityParams {
  contractId: string
  periodStart: string
  periodEnd: string
  evidenceData: {
    total_hours: number
    scada_raw_available_hours: number
    sldc_curtailment_hours: number
    planned_maintenance_hours: number
    overlap_hours: number
  }
}

export class AvailabilityService {
  static async checkAvailability(params: AvailabilityParams) {
    // 1. Get contract and parameters
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${params.contractId}`)[0]
    if (!contract) throw new Error('Contract not found')
    
    const contractParams = contract.parameters

    // 2. Run Availability Math
    const result = calculateContractualAvailability({
      totalContractHours: params.evidenceData.total_hours,
      rawUnavailableHours: params.evidenceData.total_hours - params.evidenceData.scada_raw_available_hours,
      curtailmentHours: params.evidenceData.sldc_curtailment_hours,
      plannedMaintenanceHours: params.evidenceData.planned_maintenance_hours,
      overlapHours: params.evidenceData.overlap_hours,
      guaranteePct: contractParams.availability_guarantee.value.percentage,
      ldRatePerPp: contractParams.ld_formula.value.rate_per_pp * 100,
      ldCapPct: contractParams.ld_formula.value.cap_pct,
      annualFee: contractParams.base_annual_fee.value
    })

    // 3. AI Explanation for Findings
    const opsExplanation = await callClaude({
      systemPrompt: AVAILABILITY_EXPLANATION_PROMPT,
      userMessage: `Explain this finding:\n${JSON.stringify({
        period: `${params.periodStart} to ${params.periodEnd}`,
        result,
        methodology: contractParams.availability_methodology.source_text
      })}`
    })

    // 4. Record Finding
    const [finding] = await sql`
      INSERT INTO findings (
        contract_id, check_id, verdict, expected_amount, actual_amount, gap_amount,
        formula, clause_reference, page_number, evidence_used, plain_english_fc, recommended_action, status
      ) VALUES (
        ${params.contractId}, 'AVAILABILITY_CHECK', ${result.status === 'clean' ? 'CLEAN' : 'LD_EXPOSURE'},
        ${result.ldExposure}, 0, ${result.finalLd},
        ${contractParams.availability_methodology.value.formula}, ${contractParams.availability_methodology.clause_reference},
        ${contractParams.availability_methodology.page_number}, ${sql.json(params.evidenceData)},
        ${opsExplanation}, ${result.status === 'ld_exposure' ? 'Issue LD Notice' : 'None'}, 'pending'
      ) RETURNING *
    `

    // 5. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, finding_id, actor, action)
      VALUES ('AVAILABILITY_CHECKED', ${params.contractId}, ${finding.id}, 'SYSTEM', 'Availability validated against SCADA and SLDC')
    `

    return finding
  }
}
