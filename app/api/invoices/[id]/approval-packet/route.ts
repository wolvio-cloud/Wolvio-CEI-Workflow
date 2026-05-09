import sql from '@/lib/db'
import { ApprovalPacketService } from '@/lib/services/approval-packet-service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const invoice = (await sql`
      SELECT i.*, c.customer_name, c.contract_id, c.site_name, c.asset_location
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      WHERE i.id = ${id} OR i.invoice_id = ${id}
    `)[0]

    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    const approval = (await sql`
      SELECT * FROM approvals 
      WHERE invoice_id = ${invoice.id} 
      ORDER BY created_at DESC LIMIT 1
    `)[0]

    const pdfBuffer = await ApprovalPacketService.generate({
      contract: {
        customer_name: invoice.customer_name,
        contract_id: invoice.contract_id,
        site_name: invoice.site_name,
        asset_location: invoice.asset_location
      },
      invoice: invoice,
      approval: approval
    })

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/body',
        'Content-Disposition': `attachment; filename="Approval_Packet_${invoice.invoice_id}.pdf"`
      }
    })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
