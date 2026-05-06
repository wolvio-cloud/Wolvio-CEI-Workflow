import sql from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    const { field_name, value, comments } = await request.json()

    const [updated] = await sql`
      UPDATE contract_parameters SET 
        value = ${JSON.stringify(value)},
        confidence = 'manual',
        is_manual_override = true,
        overridden_at = NOW(),
        overridden_by = 'Madhan (FC)'
      WHERE contract_id = ${id} AND field_name = ${field_name}
      RETURNING *
    `

    // Update main parameters JSONB in contracts table too
    await sql`
      UPDATE contracts SET 
        parameters = parameters || ${JSON.stringify({ [field_name]: { value } })}
      WHERE id = ${id}
    `

    await sql`
      INSERT INTO audit_log (event_type, contract_id, actor, action, old_value, new_value)
      VALUES ('PARAMETER_OVERRIDE', ${id}, 'Madhan (FC)', ${`Manually updated ${field_name}`}, NULL, ${JSON.stringify(value)})
    `

    return Response.json(updated)
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
