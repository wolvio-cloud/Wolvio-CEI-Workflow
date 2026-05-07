import { DashboardService } from '@/lib/services/dashboard-service'

export async function GET() {
  try {
    const data = await DashboardService.getPortfolioMetrics()
    return Response.json(data)
  } catch (err: any) {
    console.error('[API_DASHBOARD_ERROR]', err)
    return Response.json({ error: 'Failed to load dashboard metrics' }, { status: 500 })
  }
}
