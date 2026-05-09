'use client'

import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function DemoResetButton() {
  const [loading, setLoading] = useState(false)
  const { activeUser } = useRole()
  const router = useRouter()

  const canReset = hasPermission(activeUser.role, 'RESET_DEMO')

  const handleReset = async () => {
    if (!canReset) {
      alert('You do not have permission to perform this action.')
      return
    }

    if (!confirm('This will reset all demo data (contracts, invoices, audit logs). Continue?')) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' })
      if (res.ok) {
        alert('Demo data reset successfully.')
        router.push('/dashboard')
        router.refresh()
      } else {
        throw new Error('Reset failed')
      }
    } catch (err) {
      alert('Error resetting demo.')
    } finally {
      setLoading(false)
    }
  }

  if (!canReset) return null

  return (
    <button 
      onClick={handleReset}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-500 hover:bg-red-500/10 hover:text-red-500 group"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
      <span className="font-medium">Reset Demo</span>
    </button>
  )
}
