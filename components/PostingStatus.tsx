'use client'

import { useState } from 'react'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'
import { Clock, Loader2, CheckCircle2, Tag, MessageSquare } from 'lucide-react'

export function PostingStatus({ 
  invoiceId, 
  currentStatus,
  sapReference,
  comment
}: { 
  invoiceId: string, 
  currentStatus: string,
  sapReference?: string,
  comment?: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [refNum, setRefNum] = useState(sapReference || '')
  const [note, setNote] = useState(comment || '')
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
          role: activeUser.roleLabel,
          sapReference: refNum,
          comment: note
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
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-500" /> Internal Workflow Tracking
      </h3>
      
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          status === 'posted' ? 'bg-green-500/10 text-green-500' : 
          status === 'approved' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
        }`}>
          {status.replace(/_/g, ' ')}
        </span>
        
        {status !== 'posted' && canUpdate && (
          <button 
            disabled={loading}
            onClick={() => updateStatus(status === 'approved' ? 'sap_entry_pending' : 'posted')}
            className="text-xs text-orange-500 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            {status === 'approved' ? 'Set SAP Pending' : 'Mark as Posted'}
          </button>
        )}
      </div>

      {canUpdate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <Tag className="w-3 h-3 text-slate-500" />
            <input 
              type="text" 
              placeholder="SAP Ref #" 
              value={refNum}
              onChange={(e) => setRefNum(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white flex-1"
            />
          </div>
          <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <MessageSquare className="w-3 h-3 text-slate-500 mt-1" />
            <textarea 
              placeholder="Posting comments..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white flex-1 min-h-[60px] resize-none"
            />
          </div>
          <button 
            onClick={() => updateStatus(status)}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Update Tracking Data
          </button>
        </div>
      )}
      
      <p className="text-[10px] text-slate-500 leading-relaxed italic">
        "Internal tracking only. This does not affect SAP data."
      </p>
    </div>
  )
}
