'use client'

import { useState } from 'react'
import { Edit3, Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function ParameterOverrideActions({ 
  contractId, 
  fieldName, 
  currentValue 
}: { 
  contractId: string, 
  fieldName: string, 
  currentValue: any 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState(typeof currentValue === 'object' ? JSON.stringify(currentValue) : currentValue)
  const { activeUser } = useRole()
  const router = useRouter()

  const canOverride = hasPermission(activeUser.role, 'OVERRIDE_PARAM')

  const handleSave = async () => {
    if (!canOverride) {
      alert('You do not have permission to perform this action.')
      return
    }

    setLoading(true)
    try {
      let parsedValue = value
      try {
        if (typeof currentValue === 'object') parsedValue = JSON.parse(value)
        else if (typeof currentValue === 'number') parsedValue = Number(value)
      } catch (e) {
        // Fallback to string
      }

      const reason = prompt('Reason for override?')
      if (!reason) {
        setLoading(false)
        return
      }

      const res = await fetch(`/api/contracts/${contractId}/parameters/${fieldName}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          value: parsedValue, 
          reason,
          actor: activeUser.name,
          role: activeUser.roleLabel
        })
      })

      if (res.ok) {
        setIsEditing(false)
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-black/40 border border-orange-500/50 rounded px-2 py-1 text-xs text-white outline-none w-32"
          autoFocus
        />
        <button onClick={handleSave} disabled={loading} className="text-green-500 hover:text-green-400">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (!canOverride) return null

  return (
    <button 
      onClick={() => setIsEditing(true)}
      className="p-2 rounded-lg bg-white/5 hover:bg-orange-600/20 text-slate-500 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100"
    >
      <Edit3 className="w-4 h-4" />
    </button>
  )
}
