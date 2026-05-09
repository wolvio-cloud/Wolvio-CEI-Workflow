import sql from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status, comments, actor, role } = await request.json()

  try {
    const finding = (await sql`SELECT * FROM findings WHERE id = ${id}`)[0]
    if (!finding) return Response.json({ error: 'Finding not found' }, { status: 404 })

    // 1. Update status
    await sql`UPDATE findings SET status = ${status.toLowerCase()} WHERE id = ${id}`

    // 2. Create Approval record
    await sql`
      INSERT INTO approvals (finding_id, actor, role, action, comments)
      VALUES (${id}, ${actor || 'System User'}, ${role || 'Finance Controller'}, ${status}, ${comments || ''})
    `

    // 3. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, finding_id, actor, role, action)
      VALUES ('FINDING_STATUS_UPDATED', ${finding.contract_id}, ${id}, ${actor || 'System User'}, ${role || 'Finance Controller'}, ${`Changed status to ${status}: ${comments || 'No comment'}`})
    `

    // 4. Trigger Webhook if Approved
    if (status === 'APPROVE') {
      const n8nUrl = process.env.N8N_WEBHOOK_URL_FINDING_APPROVED
      if (n8nUrl) {
        try {
          await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'FINDING_APPROVED',
              contract_id: finding.contract_id,
              finding_id: id,
              verdict: finding.verdict,
              gap_amount: finding.gap_amount,
              actor: actor || 'Madhan (FC)'
            })
          })
        } catch (err) {
          console.warn('n8n webhook failed', err)
        }
      }
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
