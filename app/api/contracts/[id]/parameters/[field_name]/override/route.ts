import sql from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string, field_name: string }> }
) {
  const { id, field_name } = await params
  const { value, reason, actor, role } = await request.json()

  try {
    const param = (await sql`
      SELECT * FROM contract_parameters 
      WHERE contract_id = ${id} AND field_name = ${field_name}
    `)[0]

    if (!param) return Response.json({ error: 'Parameter not found' }, { status: 404 })

    const oldValue = param.value

    // 1. Update parameter
    await sql`
      UPDATE contract_parameters 
      SET value = ${JSON.stringify(value)}, 
          confidence = 'manual', 
          is_manual_override = true, 
          overridden_at = NOW(), 
          overridden_by = ${actor || 'System User'},
          source_text = ${`[MANUAL OVERRIDE] ${reason || 'Updated by user'}`}
      WHERE id = ${param.id}
    `

    // 2. Audit Log
    await sql`
      INSERT INTO audit_log (event_type, contract_id, actor, role, action, old_value, new_value)
      VALUES ('OVERRIDE_RECORDED', ${id}, ${actor || 'System User'}, ${role || 'Finance Head'}, ${`Manually overrode ${field_name}: ${reason || 'N/A'}`}, ${sql.json({ value: oldValue })}, ${sql.json({ value })})
    `

    return Response.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
