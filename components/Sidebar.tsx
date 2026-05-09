'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  Activity, 
  History, 
  Settings,
  Zap,
  ArrowLeftRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DemoResetButton } from './DemoResetButton'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contracts', href: '/contracts', icon: ShieldCheck },
  { name: 'Reconciliation', href: '/reconciliation', icon: ArrowLeftRight },
  { name: 'Ops Availability', href: '/ops', icon: Activity },
  { name: 'Audit Trail', href: '/audit', icon: History },
]

import { RoleSwitcher } from './RoleSwitcher'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 h-screen bg-[#061529] border-r border-white/5 flex flex-col sticky top-0">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <span className="text-xl font-bold tracking-tighter text-white">
          WOLVIO <span className="text-orange-500">CEI</span>
        </span>
      </div>

      <RoleSwitcher />

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-orange-600/10 text-orange-500 border border-orange-500/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-orange-500" : "group-hover:text-white"
              )} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              )}
            </Link>
          )
        })}
        <DemoResetButton />
      </nav>

      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-600/20 to-transparent border border-orange-500/10">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Support</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Need help with contract extraction? Contact the Wolvio expert team.
          </p>
        </div>
      </div>
    </div>
  )
}
