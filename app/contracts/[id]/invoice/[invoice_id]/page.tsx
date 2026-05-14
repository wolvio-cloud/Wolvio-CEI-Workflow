import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ArrowLeft,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Send,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { formatINR } from '@/lib/utils'

async function getInvoiceData(contractIdOrSlug: string, invoiceId: string) {
  const isUuid = contractIdOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  
  let contract;
  if (isUuid) {
    contract = (await sql`SELECT * FROM contracts WHERE id = ${contractIdOrSlug}`)[0]
  } else {
    contract = (await sql`SELECT * FROM contracts WHERE contract_id = ${contractIdOrSlug}`)[0]
  }
  
  if (!contract) return null

  const invoice = (await sql`
    SELECT * FROM invoices 
    WHERE contract_id = ${contract.id} AND invoice_id = ${invoiceId}
  `)[0]

  if (!invoice) return null

  const findings = await sql`
    SELECT * FROM findings 
    WHERE invoice_id = ${invoice.id}
  `

  return { contract, invoice, findings }
}

export default async function InvoiceValidationPage({ params }: { params: Promise<{ id: string, invoice_id: string }> }) {
  const { id, invoice_id } = await params
  const data = await getInvoiceData(id, invoice_id)
  if (!data) return <div>Invoice not found</div>

  const { contract, invoice, findings } = data

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <Link href={`/contracts/${id}/invoice`} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Invoice Validation</h1>
              <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-400/30 uppercase tracking-tighter">
                {invoice.invoice_id}
              </span>
            </div>
            <p className="text-slate-400">{contract.site_name} · {new Date(invoice.period_start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm font-bold">
              <Download className="w-4 h-4" /> Approval Packet
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all text-sm font-bold shadow-lg shadow-orange-900/20">
              <CheckCircle2 className="w-4 h-4" /> Approve for SAP
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COMPARISON PANEL */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Expected (CEI Math)</p>
                <p className="text-3xl font-bold text-white">{formatINR(Number(invoice.base_amount) + Number(invoice.variable_amount))}</p>
                <p className="text-xs text-slate-400">Calculated from Digital Twin parameters</p>
              </div>
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Actual (Invoice)</p>
                <p className="text-3xl font-bold text-orange-500">{formatINR(Number(invoice.total_amount) - Number(invoice.tax_amount))}</p>
                <p className="text-xs text-slate-400">Extracted from Service Provider document</p>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Findings & Exceptions
              </h2>
              
              <div className="space-y-4">
                {findings.map((f: any) => (
                  <div key={f.id} className="p-6 rounded-3xl bg-white/[0.03] border border-red-500/20 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                          {f.check_id.replace(/_/g, ' ')}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-2">{f.verdict}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">Financial Impact</p>
                        <p className="text-xl font-bold text-red-500">{formatINR(f.financial_impact)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{f.plain_english_fc}"</p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View Logic <TrendingDown className="w-3 h-3" />
                      </button>
                      <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1">
                        View Contract Source <ShieldCheck className="w-3 h-3" />
                      </button>
                      
                      <div className="ml-auto flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors tooltip" title="Route to Operations Manager">
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors tooltip" title="Mark as Correction Requested">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR: AUDIT & EVIDENCE */}
          <div className="space-y-8">
            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest opacity-50">Operational Context</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-widest opacity-50">Avg Availability</span>
                  <span className="text-sm font-bold text-white">92.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-widest opacity-50">Guarantee</span>
                  <span className="text-sm font-bold text-green-500">96.0%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: '92.5%' }} />
                </div>
                <p className="text-[10px] text-red-500 font-bold leading-tight uppercase tracking-widest opacity-50">
                  Performance shortfall detected. Verified via SCADA API.
                </p>
              </div>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest opacity-50">Verification History</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">FC</div>
                  <div>
                    <p className="text-xs text-white font-medium">Invoice extraction complete</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest opacity-50 font-black tracking-widest">Confidence: 98%</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">AI</div>
                  <div>
                    <p className="text-xs text-white font-medium">WPI Index updated</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest opacity-50 font-black tracking-widest">Base: 120.0 · Cur: 123.4</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
