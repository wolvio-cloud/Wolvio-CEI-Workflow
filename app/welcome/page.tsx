'use client'

import { ShieldCheck, Zap, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()

  const handleEnterDemo = () => {
    // Set demo cookie to bypass middleware
    document.cookie = "wolvio-auth=true; path=/; max-age=86400"
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#061529] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-900/40 animate-pulse">
            <Zap className="text-white w-12 h-12 fill-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
              WOLVIO <span className="text-orange-500">CEI</span>
            </h1>
            <p className="text-slate-400 font-medium">Contract Execution Intelligence</p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Precision Control Layer</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automating renewable energy O&M contract validation through deterministic mathematical engines and operational evidence.
            </p>
          </div>

          <button 
            onClick={handleEnterDemo}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-900/20 group"
          >
            Enter Demo Environment
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-black">
            <ShieldCheck className="w-3 h-3" />
            Phase 1 Precision Model
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Confidential & Proprietary. Authorized Demo Access Only.
        </p>
      </div>
    </div>
  )
}
