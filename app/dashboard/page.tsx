import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  TrendingDown,
  ArrowUpRight,
  MapPin,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { formatINR } from '@/lib/utils'
import { UploadContractButton } from '@/components/UploadContractButton'

async function getDashboardData() {
  const contracts = await sql`
    SELECT c.*, 
      (SELECT COUNT(*) FROM invoices WHERE contract_id = c.id AND status = 'draft') as drafts_ready,
      (SELECT COUNT(*) FROM findings WHERE contract_id = c.id AND status = 'pending') as findings_pending
    FROM contracts c
    ORDER BY created_at DESC
  `

  const metrics = {
    contractsMonitored: contracts.length,
    invoiceDraftsReady: contracts.reduce((s: number, c: any) => s + parseInt(c.drafts_ready), 0),
    findingsPending: contracts.reduce((s: number, c: any) => s + parseInt(c.findings_pending), 0),
    ldExposure: (await sql`SELECT SUM(gap_amount) FROM findings WHERE status = 'pending'`)[0].sum || 0
  }

  return { contracts, metrics }
}

export default async function DashboardPage() {
  const { contracts, metrics } = await getDashboardData()

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Portfolio Overview</h1>
            <p className="text-slate-400">Monitoring {metrics.contractsMonitored} high-value LTSA agreements</p>
          </div>
          <div className="flex gap-4">
            <UploadContractButton />
          </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Contracts Monitored" 
            value={metrics.contractsMonitored} 
            icon={ShieldCheck} 
            color="blue"
          />
          <MetricCard 
            title="Invoice Drafts Ready" 
            value={metrics.invoiceDraftsReady} 
            icon={FileText} 
            color="green"
            badge="April 2025"
          />
          <MetricCard 
            title="Findings Pending" 
            value={metrics.findingsPending} 
            icon={AlertTriangle} 
            color="amber"
          />
          <MetricCard 
            title="LD Exposure" 
            value={formatINR(metrics.ldExposure)} 
            icon={TrendingDown} 
            color="red"
            trend="+12% from Mar"
          />
        </div>

        {/* CONTRACTS TABLE */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Active Agreements</h2>
            <Link href="/contracts" className="text-orange-500 hover:text-orange-400 text-sm font-medium flex items-center gap-1 transition-colors">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {contracts.map((contract: any) => (
              <Link 
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-500/30 hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-8"
              >
                <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7 text-orange-500" />
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">
                    {contract.customer_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {contract.site_name}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {contract.contract_type}</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white font-mono uppercase tracking-wider">
                      {contract.contract_id}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {contract.drafts_ready > 0 && (
                    <span className="px-4 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-sm font-semibold">
                      {contract.drafts_ready} Draft Ready
                    </span>
                  )}
                  {contract.findings_pending > 0 && (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-semibold">
                      {contract.findings_pending} Finding Pending
                    </span>
                  )}
                  <span className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/10 text-sm font-semibold capitalize">
                    {contract.extraction_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, color, badge, trend }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  }

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 hover:shadow-2xl hover:shadow-black/50 transition-all group">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-2xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {badge && (
          <span className="px-2.5 py-1 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
          {trend && <span className="text-xs text-red-400 font-medium">{trend}</span>}
        </div>
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
