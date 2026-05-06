import sql from '@/lib/db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/contracts/sap-payload')

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  if (!runId) return Response.json({ error: 'runId required' }, { status: 400 })

  try {
    const [run] = await sql`SELECT * FROM validation_runs WHERE id = ${runId} LIMIT 1`
    if (!run) return Response.json({ error: 'Validation run not found' }, { status: 404 })

    // GATING: Check if at least one check is APPROVED or if the overall verdict is CLEAN
    const checks = run.checks || []
    const approvedCount = checks.filter((c: any) => c.status === 'APPROVED').length
    
    // In a strict enterprise system, we'd check if ALL gaps are approved.
    // For the demo, we allow payload generation if any approval exists or if it's clean.
    if (run.verdict !== 'CLEAN' && approvedCount === 0) {
      return Response.json({ 
        error: 'Approval Required', 
        details: 'This validation run has not been approved by the Finance Controller.' 
      }, { status: 403 })
    }

    const payload = {
      sap_transaction_type: 'ZOM_ADJUST',
      document_date: new Date().toISOString().split('T')[0],
      contract_id: id,
      original_invoice_id: run.invoice_id,
      adjustment_amount: run.total_gap_amount,
      currency: 'INR',
      line_items: checks.map((c: any) => ({
        description: `Variance recovery: ${c.check_name}`,
        amount: c.gap_amount || 0,
        gl_account: '440102', // Standard O&M recovery GL
        cost_center: 'IN_WIND_01'
      })),
      audit_trail: {
        validation_run_id: run.id,
        approved_by: run.approved_by,
        approved_at: run.approved_at,
        fc_notes: run.fc_notes
      }
    }

    return Response.json(payload)
  } catch (err) {
    logger.error('SAP payload generation failed', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
