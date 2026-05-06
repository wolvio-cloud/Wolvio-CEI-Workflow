import sql from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoiceId = id

  try {
    const invoice = (await sql`
      SELECT i.*, c.customer_name, c.contract_id as external_contract_id 
      FROM invoices i 
      JOIN contracts c ON i.contract_id = c.id 
      WHERE i.id = ${invoiceId}
    `)[0]

    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    // 1. Update status
    await sql`UPDATE invoices SET status = 'approved' WHERE id = ${invoiceId}`

    // 2. Create Approval record
    await sql`
      INSERT INTO approvals (invoice_id, actor, role, action, comments)
      VALUES (${invoiceId}, 'Madhan (FC)', 'Finance Controller', 'APPROVE', 'Approved for SAP posting')
    `

    // 3. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, invoice_id, actor, action)
      VALUES ('INVOICE_APPROVED', ${invoice.contract_id}, ${invoiceId}, 'Madhan (FC)', 'Manually approved invoice draft')
    `

    // 4. Trigger n8n Webhook
    let workflow_triggered = false
    const n8nUrl = process.env.N8N_WEBHOOK_URL_INVOICE_APPROVED
    
    if (n8nUrl) {
      try {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'INVOICE_APPROVED',
            contract_id: invoice.external_contract_id,
            invoice_id: invoice.invoice_id,
            total_amount: invoice.total,
            customer_name: invoice.customer_name,
            due_date: invoice.due_date,
            approver: 'Madhan (FC)',
            clause_reference: 'Clause 10.1'
          })
        })
        workflow_triggered = true
      } catch (err) {
        console.warn('n8n webhook failed, but continuing', err)
      }
    }

    return Response.json({ success: true, workflow_triggered })

  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
