'use client'

import { Sidebar } from '@/components/Sidebar'
import { 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  Clock
} from 'lucide-react'
import { formatINR } from '@/lib/utils'
import { useState, useEffect } from 'react'

export default function AvailabilityPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paramsPromise.then(p => {
      fetch(`/api/contracts/${p.id}/parameters`).then(res => res.json()).then(contractData => {
        // Mocking the evidence data for the demo
        const mockEvidence = {
          finalLd: 2520000,
          contractualAvailabilityPct: 92.5,
          shortfall: 3.5,
          guaranteePct: 96.0,
          exclusionsApplied: [
            { type: 'Grid Curtailment (SLDC/POSOCO)', hours: 87.4 },
            { type: 'Planned Maintenance (Annual)', hours: 18.0 }
          ]
        }
        setData({ contract: contractData, evidence: mockEvidence, parameters: contractData.parameters })
        setLoading(false)
      })
    })
  }, [paramsPromise])

  if (loading) return <div className="min-h-screen bg-[#061529] flex items-center justify-center text-white">Loading...</div>

  const { evidence, parameters } = data
  const methodology = Object.values(parameters).find((p: any) => p.field_name === 'availability_methodology') as any

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10 overflow-y-auto">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">
              <Activity className="w-4 h-4" /> Operational Intelligence
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Availability & LD Audit</h1>
            <p className="text-slate-400 font-medium">Reviewing Wind Farm Alpha Performance (April 2025)</p>
          </div>
          
          <div className="px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
            <AlertTriangle className="text-red-500 w-6 h-6" />
            <div>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">LD Exposure</p>
              <p className="text-2xl font-black text-white tracking-tighter">{formatINR(evidence.finalLd)}</p>
            </div>
          </div>
        </header>

        {/* TOP KPI STRIP */}
        <div className="grid grid-cols-4 gap-6">
          <KPICard label="Raw Availability" value="91.9%" sub="SCADA Baseline" />
          <KPICard label="SLDC Exclusions" value="87.4 hrs" sub="Verified Cert" color="orange" />
          <KPICard label="Contractual Availability" value="92.5%" sub="After exclusions ↓ 96% guarantee" highlight />
          <KPICard label="Audit Status" value="LD FOUND" sub="Clause 7.1 Violation" color="red" />
        </div>

        <div className="grid grid-cols-3 gap-10">
          <div className="col-span-2 space-y-10">
            {/* METHODOLOGY SECTION */}
            <section className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                  Calculation Traceability
                </h3>
                <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
                  {methodology?.clause_reference || 'Clause 7.1'}
                </span>
              </div>
              <div className="p-6 rounded-2xl bg-black/40 border border-white/5 font-medium text-slate-300 leading-relaxed italic text-sm">
                "{methodology?.source_text || "Availability shall be calculated after adjusting for SLDC curtailment and grid unavailability beyond 50 hours per year."}"
              </div>
            </section>

            {/* AUDIT CASCADE */}
            <section className="space-y-6">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Operational Audit Cascade</h3>
              <div className="space-y-4">
                <AuditItem label="Gross Period Hours" value="720.00" sub="Apr 01 - Apr 30" />
                <AuditItem label="Grid Curtailment (SLDC)" value="- 87.40" sub="Exclusion Certificate #RAJ-2025-04" color="orange" />
                <AuditItem label="Planned Maintenance" value="- 18.00" sub="Annual Quota Utilization" color="orange" />
                <div className="h-px bg-white/10 my-2" />
                <AuditItem label="Adjusted Contract Hours" value="614.60" sub="Audited Denominator" bold />
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-orange-600 to-orange-800 space-y-6 shadow-2xl shadow-orange-900/40">
              <div className="space-y-2">
                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Financial Impact</p>
                <h2 className="text-4xl font-black text-white tracking-tighter">{formatINR(evidence.finalLd)}</h2>
                <p className="text-sm text-white/80 font-medium italic">Shortfall against 96% guarantee</p>
              </div>
              <button className="w-full py-4 bg-white text-orange-700 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                Prepare LD Approval Packet
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Evidence Files</h4>
              <EvidenceFile name="SCADA_Apr25_WFA.csv" size="4.2 MB" />
              <EvidenceFile name="SLDC_Exclusion_Cert.pdf" size="1.1 MB" />
              <EvidenceFile name="Maintenance_Log_72.pdf" size="890 KB" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function KPICard({ label, value, sub, color, highlight }: any) {
  return (
    <div className={`p-6 rounded-2xl border ${
      highlight ? 'bg-orange-600/10 border-orange-500/30' : 'bg-white/[0.03] border-white/10'
    }`}>
      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black mb-1 ${
        color === 'red' ? 'text-red-500' : color === 'orange' ? 'text-orange-500' : 'text-white'
      }`}>{value}</p>
      <p className="text-[10px] text-slate-500 font-medium">{sub}</p>
    </div>
  )
}

function AuditItem({ label, value, sub, color, bold }: any) {
  return (
    <div className="flex justify-between items-center group">
      <div className="space-y-0.5">
        <p className={`text-sm font-bold ${bold ? 'text-white' : 'text-slate-300'}`}>{label}</p>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{sub}</p>
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

function EvidenceFile({ name, size }: any) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group">
      <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">
        <FileText className="w-5 h-5 text-slate-500 group-hover:text-orange-500 transition-colors" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{name}</p>
        <p className="text-[10px] text-slate-500 font-medium uppercase">{size}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </div>
  )
}
