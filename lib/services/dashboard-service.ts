import sql from '@/lib/db'

export class DashboardService {
  static async getPortfolioMetrics() {
    // 1. Get all contracts
    const contracts = await sql`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM invoices WHERE contract_id = c.id AND status = 'draft') as drafts_ready,
        (SELECT COUNT(*) FROM findings WHERE contract_id = c.id AND status = 'pending') as findings_pending
      FROM contracts c
    `

    // 2. Aggregate Global Metrics
    const metrics = {
      contractsMonitored: contracts.length,
      invoiceDraftsReady: contracts.reduce((s: number, c: any) => s + parseInt(c.drafts_ready), 0),
      findingsPending: contracts.reduce((s: number, c: any) => s + parseInt(c.findings_pending), 0),
      ldExposure: (await sql`SELECT SUM(gap_amount) FROM findings WHERE status = 'pending'`)[0].sum || 0
    }

    return {
      metrics,
      contracts: contracts.map((c: any) => ({
        ...c,
        drafts_ready: parseInt(c.drafts_ready),
        findings_pending: parseInt(c.findings_pending)
      }))
    }
  }
}
