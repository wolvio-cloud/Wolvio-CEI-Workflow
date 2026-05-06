import sql from '@/lib/db'

export async function GET() {
  try {
    const contracts = await sql`
      SELECT c.*, 
        (SELECT COUNT(*) FROM invoices WHERE contract_id = c.id AND status = 'draft') as drafts_ready,
        (SELECT COUNT(*) FROM findings WHERE contract_id = c.id AND status = 'pending') as findings_pending
      FROM contracts c
      ORDER BY created_at DESC
    `

    const metrics = {
      contractsMonitored: contracts.length,
      invoiceDraftsReady: contracts.reduce((s: number, c: any) => s + parseInt(c.drafts_ready), 0),
      findingsPending: contracts.reduce((s: number, c: any) => s + parseInt(c.findings_pending), 0),
      ldExposure: (await sql`SELECT SUM(gap_amount) FROM findings WHERE status = 'pending'`)[0].sum || 0
    }

    return Response.json({ contracts, metrics })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
