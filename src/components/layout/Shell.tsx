import { Outlet, Link, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { clearSampleData, isShowingSampleData } from '@/lib/demoSeed'

const titles: Record<string, string> = {
  '/': 'Tally',
  '/inventory': 'Inventory',
  '/expenses': 'Money',
  '/stats': 'Stats',
  '/settings': 'Settings',
}

export function Shell() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const title = titles[location.pathname] ?? 'Tally'

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-[#0a0a14]/70 px-4 pb-3 backdrop-blur-lg [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-ink-300">
            {isHome && <span className="text-xl leading-none text-gold-400">卌</span>}
            {title}
          </span>
        </div>
        <Link to="/settings" className="text-ink-400 hover:text-gold-400" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </header>

      {isShowingSampleData() && (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#ffb800]/10 px-4 py-2 text-xs text-ink-300">
          <span>You are looking at sample data. It stays in this browser.</span>
          <button onClick={clearSampleData} className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 font-semibold text-gold-400 active:scale-95">
            Clear sample data
          </button>
        </div>
      )}

      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
