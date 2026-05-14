import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  Calculator, 
  FileCheck, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react'
import { formatINR } from '@/lib/utils'
import { InvoiceService } from '@/lib/services/invoice-service'
import { InvoiceActions } from '@/components/InvoiceActions'
import { ParameterService } from '@/lib/services/parameter-service'

async function getContractAndEvidence(idOrSlug: string) {
  const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  
  let contract;
  if (isUuid) {
    contract = (await sql`SELECT * FROM contracts WHERE id = ${idOrSlug}`)[0]
  } else {
    contract = (await sql`SELECT * FROM contracts WHERE contract_id = ${idOrSlug}`)[0]
  }

  if (!contract) return { contract: null, evidence: null, parameters: {} }

  const [evidence, parameters] = await Promise.all([
    sql`
      SELECT * FROM evidence_files 
      WHERE contract_id = ${contract.id} AND period_start = '2025-04-01'
    `,
    ParameterService.getParameters(contract.id)
  ])

  return { contract, evidence: evidence[0], parameters }
}

export default async function InvoiceGeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const { contract, evidence, parameters: p } = await getContractAndEvidence(id)
  if (!contract) return <div>Contract not found</div>

  // Deterministic generation for Apr 2025
  const invoice = await InvoiceService.generateInvoiceDraft({
    contractId: id,
    periodStart: '2025-04-01',
    periodEnd: '2025-04-30',
    jmrKwh: 33360000
  })

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">
              <Calculator className="w-4 h-4" /> Billing Engine
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Invoice Draft Builder</h1>
            <p className="text-slate-400">Period: April 01, 2025 – April 30, 2025</p>
          </div>
          
          <div className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <EvidenceStatus label="WPI" status="success" />
            <EvidenceStatus label="JMR" status="success" />
            <EvidenceStatus label="SCADA" status="success" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* CALCULATIONS PANEL */}
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-8">
              <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4">Line Items</h2>
              
              <div className="space-y-6">
                <LineItem 
                  title="Base Monthly Fee (Escalated)" 
                  formula={`₹1.20Cr × (163.4 ÷ 158.8)`}
                  amount={invoice.base_amount}
                  clause="Clause 5.2"
                />
                <LineItem 
                  title="Variable Generation Charge" 
                  formula={`${evidence?.data?.net_kwh?.toLocaleString() || '0'} kWh × ₹0.042`}
                  amount={invoice.variable_amount}
                  clause="Clause 6.1"
                />
                
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-white">{formatINR(Number(invoice.base_amount) + Number(invoice.variable_amount))}</span>
                </div>

                <LineItem 
                  title="Goods and Services Tax (IGST)" 
                  formula="18% on Taxable Value"
                  amount={invoice.tax_amount}
                  clause="Clause 6.2"
                />

                <div className="p-6 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Total Invoice Amount</p>
                    <p className="text-4xl font-black text-white">{formatINR(invoice.total_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold">Due Date</p>
                    <p className="text-lg font-bold text-white">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <InvoiceActions invoiceId={invoice.id} />
              <button className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-lg border border-white/10 transition-all">
                REQUEST REVISION
              </button>
            </div>
          </div>

          {/* EVIDENCE SUMMARY */}
          <aside className="space-y-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Validation Evidence</h2>
            
            <EvidenceCard 
              title="WPI Index Data"
              source="Office of Economic Adviser"
              detail="Jan 2025: 163.4 | Jan 2024: 158.8"
              clause="Clause 5.2"
            />
            
            <EvidenceCard 
              title="JMR Certificate"
              source="SLDC Joint Meter Reading"
              detail={`Net Generation: ${evidence?.data?.net_kwh?.toLocaleString() || 'Pending Extraction'} kWh`}
              clause="Clause 6.1"
            />

            <div className="p-6 rounded-2xl bg-blue-600/5 border border-blue-500/20 space-y-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Info className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Traceability Note</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All financial calculations use a deterministic TypeScript engine — not AI. The AI (Claude) is used only to generate plain-English variance explanations from the calculation results.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function LineItem({ title, formula, amount, clause }: any) {
  return (
    <div className="flex justify-between items-start group">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h4 className="font-bold text-white">{title}</h4>
          <span className="text-[10px] font-black text-orange-500/60 uppercase">{clause}</span>
        </div>
        <p className="text-xs font-mono text-slate-500">{formula}</p>
      </div>
      <span className="text-lg font-bold text-white">{formatINR(amount)}</span>
    </div>
  )
}

function EvidenceStatus({ label, status }: any) {
  return (
    <div className="px-3 py-1.5 flex items-center gap-2 border-r border-white/10 last:border-0">
      <CheckCircle2 className="w-4 h-4 text-green-500" />
      <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{label}</span>
      <span className="text-[10px] text-green-500 font-black">OK</span>
    </div>
  )
}

function EvidenceCard({ title, source, detail, clause }: any) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
      <div className="flex justify-between">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <span className="text-[10px] font-black text-orange-500">{clause}</span>
      </div>
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{source}</p>
      <p className="text-xs text-slate-300 font-mono bg-black/20 p-2 rounded-lg border border-white/5">{detail}</p>
    </div>
  )
}
