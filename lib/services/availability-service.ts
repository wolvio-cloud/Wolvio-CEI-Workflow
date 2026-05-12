import sql from '@/lib/db'
import { calculateContractualAvailability } from '@/lib/validation/engine'
import { FindingService } from './finding-service'
import { CLIENT_ASSUMPTIONS } from '@/lib/config/client-assumptions'

export interface AvailabilityParams {
  contractId: string;
  periodStart: string;
  periodEnd: string;
  rawUnavailableHours: number;
  curtailmentHours: number;
  plannedMaintenanceHours: number;
  overlapHours: number;
}

export class AvailabilityService {
  static async validateAvailability(params: AvailabilityParams) {
    // 1. Fetch Contract
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${params.contractId}`)[0];
    if (!contract) throw new Error('Contract not found');

    const contractParams = contract.parameters;
    const annualFee = contractParams.base_monthly_fee.value * 12;

    // 2. Calculate Availability & LDs
    const result = calculateContractualAvailability({
      totalContractHours: 720, // 30 days * 24h
      rawUnavailableHours: params.rawUnavailableHours,
      curtailmentHours: params.curtailmentHours,
      plannedMaintenanceHours: params.plannedMaintenanceHours,
      overlapHours: params.overlapHours,
      guaranteePct: CLIENT_ASSUMPTIONS.operational.availabilityGuaranteePct,
      ldRatePerPp: 0.5, // Default 0.5% per 1% shortfall
      ldCapPct: 10,     // Default 10% cap
      annualFee
    });

    // 3. Automated Exception Creation
    const findings: any[] = [];

    // Finding 1: LD Exposure
    if (result.status === 'ld_exposure') {
      findings.push(await FindingService.createFinding({
        contractId: params.contractId,
        type: 'LD_EXPOSURE',
        verdict: 'LD_EXPOSURE',
        severity: 'high',
        impact: result.finalLd,
        expected: result.guaranteePct,
        actual: result.contractualAvailabilityPct,
        formula: 'Annual Fee * 0.5% * Shortfall %',
        recommendation: 'Verify SLDC curtailment certificate to potentially offset LDs.',
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        evidence: {
          rawAvailability: result.rawAvailabilityPct,
          contractualAvailability: result.contractualAvailabilityPct,
          shortfall: result.shortfallPp,
          exclusions: result.exclusionsApplied
        }
      }));
    }

    // Finding 2: Curtailment Overlap Issue (if overlap is high)
    if (params.overlapHours > 10) {
      findings.push(await FindingService.createFinding({
        contractId: params.contractId,
        type: 'CURTAILMENT_ISSUE',
        verdict: 'GAP',
        severity: 'medium',
        recommendation: 'High overlap between turbine faults and grid curtailment. Audit logs required.',
        periodStart: params.periodStart,
        periodEnd: params.periodEnd
      }));
    }

    // 4. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, actor, action)
      VALUES ('AVAILABILITY_VALIDATED', ${params.contractId}, 'SYSTEM', ${`Validated availability: ${result.contractualAvailabilityPct}%`})
    `;

    return { ...result, findings };
  }
}
