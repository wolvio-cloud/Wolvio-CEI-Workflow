import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ArrowLeft,
  Activity,
  Zap,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import Link from 'next/link'

async function getOpsData(idOrSlug: string) {
  const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  
  let contract;
  if (isUuid) {
    contract = (await sql`SELECT * FROM contracts WHERE id = ${idOrSlug}`)[0]
  } else {
    contract = (await sql`SELECT * FROM contracts WHERE contract_id = ${idOrSlug}`)[0]
  }
  
  if (!contract) return null

  // Fetch only LD/Availability related findings
  const findings = await sql`
    SELECT * FROM findings 
    WHERE contract_id = ${contract.id} AND check_id = 'LD_EXPOSURE'
  `

  return { contract, findings }
}

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getOpsData(id)
  if (!data) return <div>Contract not found</div>

  const { contract, findings } = data

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Operations Availability Hub</h1>
            <p className="text-slate-400">{contract.site_name} · Performance Monitoring</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Current Month Avail</p>
            <p className="text-3xl font-bold text-red-500">92.5%</p>
          </div>
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Contractual Target</p>
            <p className="text-3xl font-bold text-green-500">96.0%</p>
          </div>
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Status</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <p className="text-lg font-bold text-white uppercase tracking-tighter">Penalty Triggered</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Performance Findings
          </h2>
          
          <div className="space-y-4">
            {findings.map((f: any) => (
              <div key={f.id} className="p-6 rounded-3xl bg-white/[0.03] border border-orange-500/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{f.verdict}</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-2xl">{f.plain_english_it}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Exposure</p>
                    <p className="text-xl font-bold text-red-500">{f.financial_impact > 0 ? `₹${(f.financial_impact/100000).toFixed(1)}L` : 'TBD'}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center gap-4 border-t border-white/5 pt-6">
                  <button className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-all">
                    Upload Curtailment Evidence
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all">
                    Verify JMR Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
