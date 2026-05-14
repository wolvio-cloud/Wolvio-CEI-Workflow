import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ArrowLeft,
  History,
  User,
  Shield,
  Activity,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

async function getAuditData(idOrSlug: string) {
  const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  
  let contract;
  if (isUuid) {
    contract = (await sql`SELECT * FROM contracts WHERE id = ${idOrSlug}`)[0]
  } else {
    contract = (await sql`SELECT * FROM contracts WHERE contract_id = ${idOrSlug}`)[0]
  }
  
  if (!contract) return null

  const logs = await sql`
    SELECT * FROM audit_log 
    WHERE contract_id = ${contract.id}
    ORDER BY timestamp DESC
    LIMIT 50
  `

  return { contract, logs }
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAuditData(id)
  if (!data) return <div>Contract not found</div>

  const { contract, logs } = data

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-8">
        <header className="flex items-center gap-4">
          <Link href={`/dashboard`} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">System Audit Trail</h1>
            <p className="text-slate-400">{contract.site_name} · Immutable Compliance Record</p>
          </div>
        </header>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="p-20 text-center rounded-3xl bg-white/[0.02] border border-white/5 border-dashed">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">No audit logs found for this contract</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actor / Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Evidence Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                            log.actor === 'SYSTEM' ? 'bg-orange-600' : 'bg-blue-600'
                          }`}>
                            {log.actor === 'SYSTEM' ? 'AI' : 'USR'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white tracking-tight">{log.actor}</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest tracking-tighter opacity-50">{log.role || 'System'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300 font-medium leading-relaxed">{log.action}</p>
                      </td>
                      <td className="px-6 py-4">
                        {log.clause_reference ? (
                          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-orange-500 uppercase">
                            {log.clause_reference}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">System Event</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
