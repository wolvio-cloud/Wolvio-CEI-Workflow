import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { formatINR } from '@/lib/utils'

async function getAvailabilityData(id: string) {
  const contract = (await sql`SELECT * FROM contracts WHERE id = ${id}`)[0]
  const evidence = (await sql`
    SELECT * FROM evidence_files 
    WHERE contract_id = ${id} AND period_start = '2025-04-01'
  `)[0]
  
  const parameters = await sql`
    SELECT * FROM contract_parameters 
    WHERE contract_id = ${id}
  `
  
  return { contract, evidence, parameters }
}

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { contract, evidence, parameters } = await getAvailabilityData(id)
  if (!contract) return <div>Contract not found</div>

  const methodology = parameters.find((p: any) => p.field_name === 'availability_methodology')
  const ldFormula = parameters.find((p: any) => p.field_name === 'ld_formula')

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">
              <Activity className="w-4 h-4" /> Operational Intelligence
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Availability & LD Evidence</h1>
            <p className="text-slate-400">Reviewing April 2025 performance against Clause 7.1</p>
          </div>
          
          <div className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-5 h-5" />
            <div>
              <p className="text-[10px] text-red-500 font-black uppercase">Current Exposure</p>
              <p className="text-lg font-bold text-white">{formatINR(2520000)}</p>
            </div>
          </div>
        </header>

        {/* METHODOLOGY BOX */}
        <section className="p-8 rounded-3xl bg-orange-600/5 border border-orange-500/20 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Contractual Methodology (Clause 7.1)
            </h2>
            <span className="px-3 py-1 rounded bg-orange-600 text-white text-[10px] font-bold">PAGE 22</span>
          </div>
          <blockquote className="text-lg text-white font-medium leading-relaxed italic">
            "{methodology?.source_text}"
          </blockquote>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* CALCULATION CASCADE */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Calculation Cascade</h3>
            
            <div className="space-y-4">
              <CascadeItem label="Total Period Hours" value="720.00" sub="Apr 01 – Apr 30" />
              <CascadeItem 
                label="Grid Curtailment (SLDC/POSOCO)" 
                value="- 87.40" 
                sub="Clause 7.3 Exclusions" 
                color="orange"
              />
              <CascadeItem 
                label="Planned Maintenance" 
                value="- 18.00" 
                sub="Clause 7.4 Exclusions" 
                color="orange"
              />
              <div className="h-px bg-white/10 my-2" />
              <CascadeItem label="Adjusted Contract Hours" value="614.60" sub="Denominator" bold />
              
              <CascadeItem 
                label="Raw Unavailable Hours" 
                value="58.32" 
                sub="SCADA Fault Logs" 
              />
              <CascadeItem 
                label="Overlap (Fault during Curtailment)" 
                value="- 12.00" 
                sub="Removed per Clause 7.3" 
                color="orange"
              />
              <div className="h-px bg-white/10 my-2" />
              <CascadeItem label="Net Unavailable Hours" value="46.32" sub="Numerator Subtrahend" bold />
              
              <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Contractual Availability</p>
                  <p className="text-5xl font-black text-white tracking-tighter">92.5%</p>
                </div>
                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-slate-400 text-sm">Guaranteed:</span>
                    <span className="text-white font-bold">96.0%</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-red-500 text-sm font-bold">Shortfall:</span>
                    <span className="text-red-500 font-black text-xl">3.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EVIDENCE SIDEBAR */}
          <aside className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Evidence Sources</h3>
            
            <SourceCard 
              name="SCADA Raw Data" 
              status="Verified" 
              timestamp="May 01, 10:15 AM"
              file="SG_WFA_Apr25_SCADA.csv"
            />
            <SourceCard 
              name="SLDC Curtailment Log" 
              status="Verified" 
              timestamp="May 02, 09:00 AM"
              file="RAJ_SLDC_Apr25_Orders.pdf"
            />
            <SourceCard 
              name="Maintenance Notice" 
              status="Verified" 
              timestamp="Apr 15, 02:30 PM"
              file="PM_Notice_72hr.pdf"
            />

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h4 className="text-xs font-black text-white uppercase">LD Calculation</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Rate per PP</span>
                  <span className="text-white font-mono">0.5% Annual Fee</span>
                </div>
                <div className="flex justify-between text-xs text-red-500 font-bold">
                  <span className="">Exposure</span>
                  <span className="font-mono">{formatINR(2520000)}</span>
                </div>
              </div>
              <button className="w-full py-3 rounded-xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-900/20">
                Route Finding to Ops
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function CascadeItem({ label, value, sub, color, bold }: any) {
  return (
    <div className="flex justify-between items-center group">
      <div className="space-y-0.5">
        <p className={`text-sm font-bold ${bold ? 'text-white' : 'text-slate-300'}`}>{label}</p>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{sub}</p>
      </div>
      <span className={`text-lg font-mono ${
        color === 'orange' ? 'text-orange-500' : 
        bold ? 'text-white text-xl font-bold' : 'text-slate-300'
      }`}>
        {value}
      </span>
    </div>
  )
}

function SourceCard({ name, status, timestamp, file }: any) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">{name}</h4>
          <p className="text-[10px] text-slate-500">{timestamp}</p>
        </div>
        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[8px] font-black uppercase">
          {status}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/5 text-[10px] text-slate-400 truncate">
        <ShieldCheck className="w-3 h-3 text-orange-500 shrink-0" />
        {file}
      </div>
    </div>
  )
}
