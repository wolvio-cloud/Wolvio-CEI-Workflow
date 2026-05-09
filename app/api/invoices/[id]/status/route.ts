import sql from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { status, actor, role } = await request.json()

  try {
    const invoice = (await sql`SELECT * FROM invoices WHERE id = ${id} OR invoice_id = ${id}`)[0]
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    const oldStatus = invoice.status
    await sql`UPDATE invoices SET status = ${status} WHERE id = ${invoice.id}`

    // Audit log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, role, action, old_value, new_value)
      VALUES ('SAP_STATUS_UPDATED', ${invoice.contract_id}, ${invoice.id}, ${actor || 'Finance Team'}, ${role || 'Finance Controller'}, ${`Manually updated posting status to ${status}`}, ${sql.json({ status: oldStatus })}, ${sql.json({ status })})
    `

    // Update reminder if posted
    if (status === 'posted') {
      await sql`UPDATE reminders SET status = 'closed' WHERE invoice_id = ${invoice.id}`
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
