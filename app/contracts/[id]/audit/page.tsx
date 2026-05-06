import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  History, 
  User, 
  ShieldCheck, 
  Calculator, 
  Zap,
  ArrowRight,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react'
import { formatINR } from '@/lib/utils'

async function getAuditLog(contractId: string) {
  return await sql`
    SELECT * FROM audit_log 
    WHERE contract_id = ${contractId} 
    ORDER BY timestamp DESC
  `
}

export default async function AuditTrailPage({ params }: { params: { id: string } }) {
  const auditLog = await getAuditLog(params.id)

  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header>
          <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">
            <History className="w-4 h-4" /> Compliance Log
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Audit Trail</h1>
          <p className="text-slate-400">Chronological record of every system action and human decision</p>
        </header>

        <div className="relative border-l border-white/10 ml-6 pl-10 space-y-12 py-4">
          {auditLog.length === 0 ? (
            <p className="text-slate-500 italic">No audit records found.</p>
          ) : (
            auditLog.map((log: any) => (
              <AuditItem key={log.id} log={log} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

function AuditItem({ log }: { log: any }) {
  const iconMap: any = {
    INVOICE_GENERATED: Calculator,
    INVOICE_APPROVED: CheckCircle,
    PARAMETER_OVERRIDE: ShieldCheck,
    AVAILABILITY_CHECKED: History,
    WORKFLOW_TRIGGERED: Zap
  }
  
  const Icon = iconMap[log.event_type] || FileText

  return (
    <div className="relative group">
      {/* Timeline Bullet */}
      <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-[#061529] border-2 border-white/10 flex items-center justify-center group-hover:border-orange-500 transition-colors z-10 shadow-xl shadow-black">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
      </div>

      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {log.event_type.replace(/_/g, ' ')}
              {log.actor && (
                <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  by {log.actor}
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-400">{log.action}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono">
              <Clock className="w-3 h-3" />
              {new Date(log.timestamp).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {(log.clause_reference || log.formula) && (
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 grid grid-cols-2 gap-4">
            {log.clause_reference && (
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Clause Reference</p>
                <p className="text-xs text-orange-500 font-bold">{log.clause_reference}</p>
              </div>
            )}
            {log.formula && (
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Logic Used</p>
                <code className="text-[10px] text-slate-300 font-mono">{log.formula}</code>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-black uppercase tracking-widest group-hover:text-slate-400 transition-colors">
          Audit Reference: {log.id.substring(0, 8)} <ExternalLink className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  )
}

function CheckCircle(props: any) {
  return (
    <div className="text-green-500">
      <CheckCircle2 {...props} />
    </div>
  )
}
