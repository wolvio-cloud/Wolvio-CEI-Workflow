import sql from '@/lib/db'
import { CLIENT_ASSUMPTIONS } from '@/lib/config/client-assumptions'
import { v4 as uuidv4 } from 'uuid'

export interface FindingParams {
  contractId: string;
  invoiceId?: string;
  type: string;
  verdict: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact?: number;
  expected?: number;
  actual?: number;
  clause?: string;
  page?: number;
  evidence?: any;
  formula?: string;
  recommendation: string;
  periodStart?: string;
  periodEnd?: string;
}

export class FindingService {
  static async createFinding(params: FindingParams) {
    // 1. Determine routing based on assumptions
    const assignedRoles = (CLIENT_ASSUMPTIONS.routing as any)[params.type] || ['CEI_ADMIN'];
    const routedTo = assignedRoles[0]; // Primary assigned role

    // 2. Insert into findings table
    const [finding] = await sql`
      INSERT INTO findings (
        contract_id, 
        invoice_id, 
        check_id, 
        verdict, 
        severity,
        financial_impact,
        expected_amount,
        actual_amount,
        gap_amount,
        clause_reference,
        page_number,
        evidence_used,
        formula,
        recommended_action,
        status,
        routed_to,
        assigned_role,
        period_start,
        period_end
      ) VALUES (
        ${params.contractId},
        ${params.invoiceId},
        ${params.type},
        ${params.verdict},
        ${params.severity},
        ${params.impact || 0},
        ${params.expected || 0},
        ${params.actual || 0},
        ${Math.abs((params.expected || 0) - (params.actual || 0))},
        ${params.clause},
        ${params.page},
        ${sql.json(params.evidence || {})},
        ${params.formula},
        ${params.recommendation},
        'open',
        ${routedTo},
        ${sql.json(assignedRoles)},
        ${params.periodStart},
        ${params.periodEnd}
      )
      RETURNING *
    `;

    // 3. Log to audit trail
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, finding_id, actor, action)
      VALUES ('EXCEPTION_CREATED', ${params.contractId}, ${params.invoiceId}, ${finding.id}, 'SYSTEM', ${`Automated exception created: ${params.type}`})
    `;

    return finding;
  }

  static async updateFindingStatus(findingId: string, status: string, actor: string, role: string, comment?: string) {
    const oldFinding = (await sql`SELECT * FROM findings WHERE id = ${findingId}`)[0];
    if (!oldFinding) throw new Error('Finding not found');

    const [updated] = await sql`
      UPDATE findings 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${findingId}
      RETURNING *
    `;

    // Add to approvals table for history
    await sql`
      INSERT INTO approvals (finding_id, actor, role, action, comments)
      VALUES (${findingId}, ${actor}, ${role}, ${status.toUpperCase()}, ${comment || ''})
    `;

    // Log to audit trail
    await sql`
      INSERT INTO audit_log (
        event_type, contract_id, invoice_id, finding_id, actor, action, old_value, new_value
      ) VALUES (
        'EXCEPTION_STATUS_UPDATED', 
        ${oldFinding.contract_id}, 
        ${oldFinding.invoice_id}, 
        ${findingId}, 
        ${actor}, 
        ${`Status changed from ${oldFinding.status} to ${status}`},
        ${sql.json({ status: oldFinding.status })},
        ${sql.json({ status })}
      )
    `;

    return updated;
  }

  static async getFindingsByRole(role: string) {
    // IT_OBSERVER and CEI_ADMIN see all
    if (role === 'IT_OBSERVER' || role === 'CEI_ADMIN') {
      return await sql`SELECT * FROM findings ORDER BY created_at DESC`;
    }

    // Role-based filtering
    return await sql`
      SELECT * FROM findings 
      WHERE assigned_role ? ${role}
      ORDER BY created_at DESC
    `;
  }
}
