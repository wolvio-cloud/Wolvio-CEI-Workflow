import { Sidebar } from '@/components/Sidebar'
import sql from '@/lib/db'
import { 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  User,
  Zap,
  Loader2
} from 'lucide-react'
import { formatINR } from '@/lib/utils'

async function getFindings(contractId: string) {
  return await sql`
    SELECT f.*, c.customer_name 
    FROM findings f 
    JOIN contracts c ON f.contract_id = c.id 
    WHERE f.contract_id = ${contractId} AND f.status = 'pending'
  `
}

export default async function ApprovalPage({ params }: { params: { id: string } }) {
  const findings = await getFindings(params.id)
  
  return (
    <div className="flex min-h-screen bg-[#061529]">
      <Sidebar />
      
      <main className="flex-1 p-10 space-y-10">
        <header>
          <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">
            <ShieldCheck className="w-4 h-4" /> Compliance & Approvals
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Active Findings</h1>
          <p className="text-slate-400">Review findings requiring executive decision</p>
        </header>

        <div className="space-y-6">
          {findings.length === 0 ? (
            <div className="p-20 text-center space-y-4 rounded-3xl border border-white/5 bg-white/[0.01]">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">All Clear</h2>
              <p className="text-slate-500">No pending findings for this contract.</p>
            </div>
          ) : (
            findings.map((f: any) => (
              <FindingCard key={f.id} finding={f} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

function FindingCard({ finding }: { finding: any }) {
  return (
    <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-8 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <AlertTriangle className="w-40 h-40 text-red-500" />
      </div>

      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{finding.verdict}</h3>
            <p className="text-slate-400 font-medium">Liquidated Damages identified in Availability Check</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Impact Amount</p>
          <p className="text-3xl font-black text-white">{formatINR(finding.gap_amount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-2">
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Digital Audit Trace</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Clause Reference:</span>
              <span className="text-xs text-white font-bold">{finding.clause_reference} (Page {finding.page_number})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Formula:</span>
              <code className="text-[10px] text-orange-400">{finding.formula}</code>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-500 uppercase">Analysis Summary</h4>
            <p className="text-sm text-slate-300 leading-relaxed italic">
              "{finding.plain_english_fc}"
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Workflow Routing</h4>
          <div className="flex items-center gap-3">
            <UserAvatar name="Madhan (FC)" role="Approver" />
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <UserAvatar name="Operations Manager" role="Reviewer" />
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            <button className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Approve & Issue LD Notice
            </button>
            <button className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm uppercase tracking-widest border border-white/10">
              Request Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserAvatar({ name, role }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <User className="w-5 h-5 text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] text-white font-bold leading-tight">{name}</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{role}</p>
      </div>
    </div>
  )
}
