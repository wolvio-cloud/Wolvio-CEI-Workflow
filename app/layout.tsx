import type { Metadata } from 'next'
import './globals.css'
import { DemoControlPanel } from '@/components/DemoControlPanel'
import { ConfidentialBanner } from '@/components/ConfidentialBanner'
import { ensureSeeded } from '@/lib/db/seed-check'

// Temporarily disabled Google Fonts due to Turbopack resolution issue after cache wipe
const montserrat = { variable: 'font-sans' }
const jetbrainsMono = { variable: 'font-mono' }

export const metadata: Metadata = {
  title: 'Wolvio — Contract Execution Intelligence',
  description: 'Billing validation powered by AI',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded()
  return (
    <html lang="en" className={`${montserrat.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
      <body className="bg-[--color-wolvio-dark] text-white font-sans">
        <ConfidentialBanner />
        <main className="w-full relative overflow-visible">
          {children}
        </main>
        <DemoControlPanel />
      </body>
    </html>
  )
}
