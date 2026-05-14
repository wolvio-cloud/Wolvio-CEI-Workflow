import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ArrowLeft,
  FileText,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { formatINR } from '@/lib/utils'

async function getReconciliationData(idOrSlug: string) {
  const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  
  let contract;
  if (isUuid) {
    contract = (await sql`SELECT * FROM contracts WHERE id = ${idOrSlug}`)[0]
  } else {
    contract = (await sql`SELECT * FROM contracts WHERE contract_id = ${idOrSlug}`)[0]
  }
  
  if (!contract) return null

  const invoices = await sql`
    SELECT * FROM invoices 
    WHERE contract_id = ${contract.id}
    ORDER BY period_start DESC
  `

  return { contract, invoices }
}

export default async function ReconciliationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getReconciliationData(id)
  if (!data) return <div>Contract not found</div>

  const { contract, invoices } = data

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Reconciliation Hub</h1>
            <p className="text-slate-400">{contract.site_name} · {contract.contract_id}</p>
          </div>
        </header>

        <div className="space-y-6">
          {invoices.map((inv: any) => (
            <Link 
              key={inv.id}
              href={`/contracts/${id}/invoice/${inv.invoice_id}`}
              className="block p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-orange-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-orange-600/10 text-orange-500 border border-orange-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest">{inv.invoice_id}</p>
                    <h3 className="text-xl font-bold text-white">{new Date(inv.period_start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-white">{formatINR(inv.total_amount)}</p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-orange-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    draft: 'bg-slate-500/20 text-slate-400',
    pending_approval: 'bg-amber-500/20 text-amber-500',
    approved: 'bg-green-500/20 text-green-500',
    posted: 'bg-blue-500/20 text-blue-500'
  }
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${styles[status].replace('bg-', 'border-')}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
