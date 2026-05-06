import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  FileText, 
  ChevronRight, 
  AlertCircle, 
  Edit3, 
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { formatINR } from '@/lib/utils'

async function getContractData(id: string) {
  const contract = (await sql`SELECT * FROM contracts WHERE id = ${id}`)[0]
  if (!contract) return null

  const parameters = await sql`
    SELECT * FROM contract_parameters 
    WHERE contract_id = ${id}
  `

  return { contract, parameters }
}

export default async function ContractTwinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getContractData(id)
  if (!data) return <div>Contract not found</div>

  const { contract, parameters } = data

  const billingParams = parameters.filter((p: any) => 
    ['base_monthly_fee', 'base_annual_fee', 'wpi_escalation', 'variable_rate', 'gst_treatment', 'payment_terms'].includes(p.field_name)
  )
  
  const omParams = parameters.filter((p: any) => 
    ['availability_guarantee', 'availability_methodology', 'curtailment_exclusion', 'planned_maintenance_exclusion', 'ld_formula', 'bonus_formula'].includes(p.field_name)
  )

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{contract.customer_name}</h1>
              <span className="px-3 py-1 rounded-full bg-orange-600/20 text-orange-500 text-xs font-bold border border-orange-500/30 uppercase tracking-tighter">
                {contract.contract_id}
              </span>
            </div>
            <p className="text-slate-400">{contract.site_name} · {contract.asset_location}</p>
          </div>

          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-black">Extraction Quality</p>
              <p className="text-xl font-bold text-green-500">{contract.extraction_quality_score}%</p>
            </div>
            <button className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Generate April Invoice
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PANEL 1: BILLING TERMS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-widest text-[10px] opacity-50">
              Billing & Commercial Terms
            </h2>
            <div className="space-y-4">
              {billingParams.map((p: any) => (
                <ParameterCard key={p.id} param={p} />
              ))}
            </div>
          </section>

          {/* PANEL 2: O&M TERMS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-widest text-[10px] opacity-50">
              O&M & Availability Terms
            </h2>
            <div className="space-y-4">
              {omParams.map((p: any) => (
                <ParameterCard key={p.id} param={p} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ParameterCard({ param }: { param: any }) {
  const value = typeof param.value === 'object' ? JSON.stringify(param.value) : param.value
  
  return (
    <div className={`p-5 rounded-2xl bg-white/[0.03] border transition-all group relative overflow-hidden ${
      param.confidence === 'low' ? 'border-amber-500/50' : 'border-white/10 hover:border-white/20'
    }`}>
      {/* Traceability Rule: Clause Reference MUST be visible */}
      <div className="flex justify-between items-start mb-3">
        <span className="px-2 py-1 rounded bg-orange-600 text-[10px] font-black text-white uppercase tracking-tighter">
          {param.clause_reference}
        </span>
        <ConfidenceBadge confidence={param.confidence} />
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{param.field_name.replace(/_/g, ' ')}</p>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatValue(param.field_name, param.value)}
          </div>
        </div>
        
        <button className="p-2 rounded-lg bg-white/5 hover:bg-orange-600/20 text-slate-500 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {param.confidence === 'low' && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase">
          <AlertTriangle className="w-3 h-3" /> Manual Verification Required
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: any = {
    high: 'text-green-500 border-green-500/20 bg-green-500/5',
    medium: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
    low: 'text-red-500 border-red-500/20 bg-red-500/5',
    manual: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
  }

  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function formatValue(field: string, val: any) {
  if (field.includes('fee')) return formatINR(val)
  if (field === 'variable_rate') return `₹${val.rate_per_kwh}/kWh`
  if (field.includes('percentage') || field.includes('pct')) return `${val}%`
  if (typeof val === 'object') return val.type || val.percentage || 'View Details'
  return val.toString()
}
