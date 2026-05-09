'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function FindingActions({ findingId }: { findingId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { activeUser } = useRole()
  const router = useRouter()

  const canApprove = hasPermission(activeUser.role, 'APPROVE_LD')

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION', comments: string = '') => {
    if (!canApprove && action === 'APPROVE') {
      alert('You do not have permission to perform this action.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(`/api/findings/${findingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action, 
          comments,
          actor: activeUser.name,
          role: activeUser.roleLabel
        })
      })

      if (!res.ok) throw new Error('Failed to update status')
      
      setStatus('success')
      router.refresh()
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Processing Decision...
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-500 font-bold uppercase tracking-widest text-xs py-4">
        <CheckCircle2 className="w-4 h-4" /> Action Recorded
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 pt-4">
        <button 
          onClick={() => handleAction('APPROVE', 'Approved for LD Notice')}
          disabled={!canApprove}
          className={`flex-1 py-4 rounded-xl text-white font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
            canApprove ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Send className="w-4 h-4" /> Approve & Issue LD Notice
        </button>
        <button 
          onClick={() => {
            const reason = prompt('Reason for review request?')
            if (reason) handleAction('REQUEST_CORRECTION', reason)
          }}
          className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm uppercase tracking-widest border border-white/10 transition-all active:scale-95"
        >
          Request Review
        </button>
      </div>
      {!canApprove && (
        <p className="text-[10px] text-red-500/50 font-bold uppercase tracking-widest text-center">
          Approvals restricted to Operations Manager or Finance Controller
        </p>
      )}
    </div>
  )
}
