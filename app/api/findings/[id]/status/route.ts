import sql from '@/lib/db'
import { FindingService } from '@/lib/services/finding-service'
import { ReminderService } from '@/lib/services/reminder-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status, comments, actor, role } = await request.json()

  try {
    const updatedFinding = await FindingService.updateFindingStatus(id, status, actor, role, comments)

    // Trigger Webhook if Approved
    if (status === 'APPROVE') {
      const n8nUrl = process.env.N8N_WEBHOOK_URL_FINDING_APPROVED
      if (n8nUrl) {
        try {
          await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'FINDING_APPROVED',
              contract_id: updatedFinding.contract_id,
              finding_id: id,
              verdict: updatedFinding.verdict,
              gap_amount: updatedFinding.gap_amount,
              actor: actor || 'Madhan (FC)'
            })
          })
        } catch (err) {
          console.warn('n8n webhook failed', err)
        }
      }
    }

    // Update reminders
    if (status === 'APPROVE' || status === 'REJECT') {
      await sql`UPDATE reminders SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE finding_id = ${id}`
    } else {
      await ReminderService.scheduleWorkflowReminders('FINDING', id, status)
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
