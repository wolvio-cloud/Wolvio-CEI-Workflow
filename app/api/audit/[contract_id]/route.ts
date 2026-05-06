import sql from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { contract_id: string } }
) {
  const contractId = params.contract_id

  try {
    const auditLog = await sql`
      SELECT * FROM audit_log 
      WHERE contract_id = ${contractId} 
      ORDER BY timestamp DESC
    `
    return Response.json(auditLog)
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
