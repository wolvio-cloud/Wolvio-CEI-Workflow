import { AvailabilityService } from '@/lib/services/availability-service'

export async function POST(request: Request) {
  try {
    const { contract_id, period_start, period_end, evidence_data } = await request.json()

    if (!contract_id || !evidence_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const finding = await AvailabilityService.checkAvailability({
      contractId: contract_id,
      periodStart: period_start,
      periodEnd: period_end,
      evidenceData: evidence_data
    })

    return Response.json(finding)

  } catch (err: any) {
    console.error('[API_AVAILABILITY_CHECK_ERROR]', err)
    return Response.json({ 
      error: err.message || 'Internal Server Error' 
    }, { status: 500 })
  }
}
