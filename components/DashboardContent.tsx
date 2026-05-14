'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/components/RoleProvider'
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  TrendingDown,
  Bell,
  ArrowRight,
  ClipboardList,
  RefreshCcw
} from 'lucide-react'
import { formatINR } from '@/lib/utils'
import Link from 'next/link'

export function DashboardContent() {
  const { activeUser } = useRole()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      await fetch('/api/admin/reset-demo', { method: 'POST' })
      window.location.reload()
    } catch (err) {
      alert('Reset failed')
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/dashboard/metrics?role=${activeUser.role}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch dashboard metrics', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeUser.role])

  if (loading) return <div className="animate-pulse space-y-10">
    <div className="h-32 bg-white/5 rounded-3xl" />
    <div className="grid grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-40 bg-white/5 rounded-3xl" />)}
    </div>
  </div>

  const { metrics, recentFindings, recentReminders } = data

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Welcome, {activeUser.name}</h1>
          <p className="text-slate-400">Monitoring workflow for role: <span className="text-orange-500 font-semibold">{activeUser.roleLabel}</span></p>
        </div>
        <button 
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold"
        >
          <RefreshCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting...' : 'Refresh Demo Data'}
        </button>
      </header>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Open Exceptions" 
          value={metrics.openExceptions} 
          icon={AlertTriangle} 
          color="amber"
          badge={metrics.openExceptions > 0 ? 'Action Req' : null}
        />
        <MetricCard 
          title="Pending Approvals" 
          value={metrics.pendingApprovals} 
          icon={FileText} 
          color="blue"
        />
        <MetricCard 
          title="Reminders Due" 
          value={metrics.remindersDue} 
          icon={Bell} 
          color="green"
        />
        <MetricCard 
          title="LD Exposure (Queued)" 
          value={formatINR(metrics.ldExposure)} 
          icon={TrendingDown} 
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* EXCEPTIONS QUEUE */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              Role Queue: {activeUser.roleLabel}
            </h2>
          </div>

          <div className="space-y-4">
            {recentFindings.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 border-dashed">
                <p className="text-slate-500 text-sm">No items currently assigned to your queue.</p>
              </div>
            ) : (
              recentFindings.map((finding: any) => (
                <Link 
                  key={finding.id}
                  href={finding.invoice_id ? `/contracts/${finding.contract_id}/invoice/${finding.invoice_id}` : `/contracts/${finding.contract_id}`}
                  className="block p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-orange-500/50 hover:bg-white/[0.05] transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      finding.severity === 'high' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {finding.check_id.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(finding.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{finding.verdict}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{finding.recommended_action}</p>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* REMINDERS */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            Internal Reminders
          </h2>

          <div className="space-y-4">
            {recentReminders.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 border-dashed">
                <p className="text-slate-500 text-sm">No upcoming reminders for your role.</p>
              </div>
            ) : (
              recentReminders.map((reminder: any) => (
                <div 
                  key={reminder.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-4"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{reminder.message}</p>
                    <p className="text-[10px] text-slate-500">Due: {new Date(reminder.due_date).toLocaleDateString()}</p>
                  </div>
                  <button className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                    Snooze <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, color, badge }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  }

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 hover:shadow-2xl hover:shadow-black/50 transition-all group">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {badge && (
          <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{title}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
      </div>
    </div>
  )
}
