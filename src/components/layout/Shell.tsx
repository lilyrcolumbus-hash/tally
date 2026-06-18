import { Outlet, Link, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'

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
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur-md">
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

      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
