import { InvoiceService } from '@/lib/services/invoice-service'

export async function POST(request: Request) {
  try {
    const { contract_id, period_start, period_end, jmr_kwh } = await request.json()

    if (!contract_id || !period_start || !period_end || jmr_kwh === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const invoice = await InvoiceService.generateInvoiceDraft({
      contractId: contract_id,
      periodStart: period_start,
      periodEnd: period_end,
      jmrKwh: jmr_kwh
    })

    return Response.json(invoice)

  } catch (err: any) {
    console.error('[API_INVOICE_GENERATE_ERROR]', err)
    return Response.json({ 
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}
