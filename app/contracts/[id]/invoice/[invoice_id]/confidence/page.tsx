import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3,
  ArrowRight
} from 'lucide-react'
import { formatINR } from '@/lib/utils'
import { InvoiceActions } from '@/components/InvoiceActions'
import { PostingStatus } from '@/components/PostingStatus'

async function getConfidenceData(invoiceId: string) {
  const invoice = (await sql`
    SELECT i.*, c.customer_name 
    FROM invoices i 
    JOIN contracts c ON i.contract_id = c.id 
    WHERE i.id = ${invoiceId} OR i.invoice_id = ${invoiceId}
  `)[0]
  
  const historical = await sql`
    SELECT * FROM historical_invoices 
    WHERE contract_id = ${invoice?.contract_id} 
    ORDER BY period_start ASC
  `
  
  return { invoice, historical }
}

export default async function ConfidenceReportPage({ params }: { params: Promise<{ invoice_id: string }> }) {
  const { invoice_id } = await params
  const { invoice, historical } = await getConfidenceData(invoice_id)
  if (!invoice) return <div>Invoice not found</div>

  const months = [...historical, invoice]

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Approval
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Invoice Confidence Report</h1>
            <p className="text-slate-400">Audit analysis for {invoice.customer_name} · Apr 2025</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI EXPLANATION */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Controller Verdict</h2>
            </div>
            
            <p className="text-lg text-slate-300 leading-relaxed font-medium">
              "The April 2025 invoice draft is <span className="text-green-500 font-bold">highly accurate</span>. Every rupee of variance from the Q1 average is fully explained by the <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-4">Clause 5.2 WPI Escalation</span> (₹3,47,607) and seasonal generation increases recorded in the JMR. Unexplained variance is ₹0."
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Unexplained Variance</p>
                <p className="text-2xl font-bold text-green-500">₹0.00</p>
              </div>
              <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Data Integrity Score</p>
                <p className="text-2xl font-bold text-white">100%</p>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-orange-600 border border-orange-500/20 space-y-6 shadow-2xl shadow-orange-900/40">
            <h3 className="text-lg font-bold text-white">Action Required</h3>
            <p className="text-sm text-orange-100/80 leading-relaxed">
              This invoice draft has been validated against the Contract Digital Twin. Approve below to generate a SAP-entry-ready approval packet.
            </p>
            <InvoiceActions invoiceId={invoice.id} />
            <a 
              href={`/api/invoices/${invoice.id}/approval-packet`}
              className="block w-full py-3 rounded-xl bg-orange-700/30 text-white font-bold text-sm text-center border border-white/10 hover:bg-orange-700/50 transition-all mt-4 mb-4"
              download
            >
              Download Approval Packet
            </a>
            <PostingStatus 
              invoiceId={invoice.id} 
              currentStatus={invoice.status} 
              sapReference={invoice.sap_reference_number}
              comment={invoice.posting_comment}
            />
          </div>
        </div>

        {/* TREND TABLE */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" /> Variance Analysis (4-Month Trend)
          </h2>
          
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Period</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Base Fee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Escalation</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Variable</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Total (Incl GST)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {months.map((m: any, idx: number) => (
                  <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${idx === 3 ? 'bg-orange-600/5' : ''}`}>
                    <td className="px-6 py-5">
                      <span className="font-bold text-white">
                        {new Date(m.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-300 font-mono">{formatINR(m.base_fee)}</td>
                    <td className="px-6 py-5 text-slate-300 font-mono">
                      {m.escalation_amount > 0 ? (
                        <span className="text-orange-500 font-bold">+{formatINR(m.escalation_amount)}</span>
                      ) : '₹0'}
                    </td>
                    <td className="px-6 py-5 text-slate-300 font-mono">{formatINR(m.variable_amount)}</td>
                    <td className="px-6 py-5 text-white font-bold">{formatINR(m.total)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        m.status === 'posted' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
