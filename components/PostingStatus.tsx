'use client'

import { useState } from 'react'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function PostingStatus({ invoiceId, currentStatus }: { invoiceId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const { activeUser } = useRole()

  const canUpdate = hasPermission(activeUser.role, 'APPROVE_INVOICE')

  const updateStatus = async (newStatus: string) => {
    if (!canUpdate) {
      alert('You do not have permission to perform this action.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          actor: activeUser.name,
          role: activeUser.roleLabel
        })
      })
      if (res.ok) setStatus(newStatus)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-500" /> Internal Posting Status
      </h3>
      
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          status === 'posted' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
        }`}>
          {status.replace(/_/g, ' ')}
        </span>
        
        {(status === 'approved' || status === 'ready') && canUpdate && (
          <button 
            disabled={loading}
            onClick={() => updateStatus('posted')}
            className="text-xs text-orange-500 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Mark as Posted in SAP
          </button>
        )}
      </div>
      
      <p className="text-[10px] text-slate-500 leading-relaxed italic">
        "Internal tracking only. This does not affect SAP data."
      </p>
    </div>
  )
}
