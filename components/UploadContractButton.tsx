'use client'

import { useRole } from './RoleProvider'
import { hasPermission } from '@/lib/config/roles'

export function UploadContractButton() {
  const { activeUser } = useRole()
  const canUpload = hasPermission(activeUser.role, 'UPLOAD_CONTRACT')

  if (!canUpload) return null

  return (
    <button 
      onClick={() => alert('Contract ingestion is automated in this demo.')}
      className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all shadow-lg shadow-orange-900/20"
    >
      Upload New Contract
    </button>
  )
}
