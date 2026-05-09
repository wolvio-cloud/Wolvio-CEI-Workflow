'use client'

import { USERS, Role } from '@/lib/config/roles';
import { useRole } from './RoleProvider';
import { User, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function RoleSwitcher() {
  const { activeUser, setRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative px-4 pb-4 border-b border-white/5">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-500/20 flex items-center justify-center">
          <User className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Active Role</p>
          <p className="text-xs text-white font-bold truncate">{activeUser.roleLabel}</p>
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-2 bg-[#0a1f3d] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {(Object.keys(USERS) as Role[]).map((roleKey) => (
            <button
              key={roleKey}
              onClick={() => {
                setRole(roleKey);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-xs transition-colors hover:bg-white/5 flex items-center justify-between ${
                activeUser.role === roleKey ? 'text-orange-500 font-bold bg-orange-600/5' : 'text-slate-400'
              }`}
            >
              {USERS[roleKey].roleLabel}
              {activeUser.role === roleKey && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
