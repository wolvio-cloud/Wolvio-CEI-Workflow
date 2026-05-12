import sql from '@/lib/db'
import { ReminderService } from '@/lib/services/reminder-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status, actor, role, sapReference, comment } = await request.json()

  try {
    const invoice = (await sql`SELECT * FROM invoices WHERE id = ${id} OR invoice_id = ${id}`)[0]
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    const oldStatus = invoice.status
    await sql`
      UPDATE invoices 
      SET status = ${status}, 
          sap_reference_number = ${sapReference || invoice.sap_reference_number},
          posting_comment = ${comment || invoice.posting_comment}
      WHERE id = ${invoice.id}
    `

    // Audit log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, role, action, old_value, new_value)
      VALUES ('SAP_STATUS_UPDATED', ${invoice.contract_id}, ${invoice.id}, ${actor || 'Finance Team'}, ${role || 'Finance Controller'}, ${`Manually updated posting status to ${status}`}, ${sql.json({ status: oldStatus })}, ${sql.json({ status })})
    `

    // Update reminder if completed
    if (status === 'posted' || status === 'closed') {
      await sql`UPDATE reminders SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE invoice_id = ${invoice.id}`
    } else {
      // Schedule follow-ups if needed
      await ReminderService.scheduleWorkflowReminders('INVOICE', invoice.id, status)
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
