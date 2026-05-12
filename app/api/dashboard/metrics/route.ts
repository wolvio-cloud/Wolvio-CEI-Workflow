import sql from '@/lib/db'
import { FindingService } from '@/lib/services/finding-service'
import { ReminderService } from '@/lib/services/reminder-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || 'CEI_ADMIN'

  try {
    const findings = await FindingService.getFindingsByRole(role)
    const reminders = await ReminderService.getRemindersByRole(role)
    
    const contracts = await sql`SELECT COUNT(*) FROM contracts`
    
    // Role-specific metrics
    const metrics = {
      openExceptions: findings.filter((f: any) => f.status === 'open' || f.status === 'routed').length,
      pendingApprovals: findings.filter((f: any) => f.status === 'in_review').length,
      remindersDue: reminders.length,
      ldExposure: findings
        .filter((f: any) => f.check_id === 'LD_EXPOSURE' && f.status !== 'closed')
        .reduce((sum: number, f: any) => sum + parseFloat(f.financial_impact || 0), 0),
      sapPending: (await sql`SELECT COUNT(*) FROM invoices WHERE status = 'approved' OR status = 'sap_entry_pending'`)[0].count
    }

    return Response.json({
      metrics,
      recentFindings: findings.slice(0, 5),
      recentReminders: reminders.slice(0, 5)
    })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
