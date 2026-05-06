import sql from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { ValidationResultSchema } from '@/lib/schemas/validation'

const logger = createLogger('api/validation-runs/approve')

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const { finding_id, action, fc_notes, approved_by } = await request.json()

    // 1. Fetch the existing run
    const [run] = await sql`SELECT * FROM validation_runs WHERE id = ${id} LIMIT 1`
    if (!run) return Response.json({ error: 'Validation run not found' }, { status: 404 })

    const checks = run.checks || []
    
    // 2. Update specific check or the whole run
    if (finding_id) {
      // Update individual check status
      const updatedChecks = checks.map((c: any) => {
        if (c.check_id === finding_id) {
          return { ...c, status: action, fc_notes }
        }
        return c
      })
      
      await sql`
        UPDATE validation_runs 
        SET checks = ${sql.json(updatedChecks)},
            approved_by = ${approved_by || 'Finance Controller'},
            approved_at = NOW(),
            fc_notes = ${fc_notes}
        WHERE id = ${id}
      `
    } else {
      // Approve the entire run
      const updatedChecks = checks.map((c: any) => ({ ...c, status: action }))
      await sql`
        UPDATE validation_runs 
        SET checks = ${sql.json(updatedChecks)},
            approved_by = ${approved_by || 'Finance Controller'},
            approved_at = NOW(),
            fc_notes = ${fc_notes}
        WHERE id = ${id}
      `
    }

    return Response.json({ status: 'success', action, id })
  } catch (err) {
    logger.error('Approval failed', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
