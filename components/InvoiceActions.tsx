'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { activeUser } = useRole()
  const router = useRouter()

  const canApprove = hasPermission(activeUser.role, 'APPROVE_INVOICE')

  const handleApprove = async () => {
    if (!canApprove) {
      alert('You do not have permission to perform this action.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: activeUser.name,
          role: activeUser.roleLabel
        })
      })

      if (!res.ok) throw new Error('Failed to approve invoice')
      
      setStatus('success')
      router.refresh()
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="w-full py-4 rounded-xl bg-white/10 text-white font-black text-lg flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin" /> Preparing approval packet...
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-lg flex items-center justify-center gap-2">
        <CheckCircle2 className="w-6 h-6" /> Approved — Ready for Finance Review
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button 
        onClick={handleApprove}
        disabled={!canApprove}
        className={`w-full py-4 rounded-xl font-black text-lg transition-transform shadow-xl flex items-center justify-center gap-2 ${
          canApprove ? 'bg-white text-orange-600 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
        }`}
      >
        {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
        Approve Invoice Draft
      </button>
      {!canApprove && (
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center">
          Approval restricted to Finance Controller, Finance Head, or CEI Admin
        </p>
      )}
    </div>
  )
}
