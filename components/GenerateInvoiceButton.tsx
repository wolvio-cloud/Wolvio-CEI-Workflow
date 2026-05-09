'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function GenerateInvoiceButton({ contractId }: { contractId: string }) {
  const { activeUser } = useRole()
  const canGenerate = hasPermission(activeUser.role, 'GENERATE_INVOICE')

  if (!canGenerate) {
    return (
      <div className="px-6 py-3 rounded-xl bg-slate-800 text-slate-500 font-bold flex items-center gap-2 opacity-50 cursor-not-allowed">
        <FileText className="w-5 h-5" /> Generate April Invoice
      </div>
    )
  }

  return (
    <Link 
      href={`/contracts/${contractId}/invoice/generate`}
      className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2"
    >
      <FileText className="w-5 h-5" /> Generate April Invoice
    </Link>
  )
}
