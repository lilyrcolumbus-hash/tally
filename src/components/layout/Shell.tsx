import { Outlet, Link, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useEntries } from '@/contexts/EntriesContext'
import { cn } from '@/lib/utils'

const titles: Record<string, string> = {
  '/': 'Tally.ly',
  '/inventory': 'Inventory',
  '/expenses': 'Expenses',
  '/stats': 'Stats',
  '/settings': 'Settings',
}

export function Shell() {
  const location = useLocation()
  const { mode } = useEntries()
  const title = titles[location.pathname] ?? 'Tally.ly'

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight text-ink-300">
            {title === 'Tally.ly' ? (
              <>
                Tally<span className="text-gold-400">.ly</span>
              </>
            ) : (
              title
            )}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              mode === 'cloud' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-ink-800 text-ink-400',
            )}
            title={mode === 'cloud' ? 'Synced to the cloud' : 'Saved on this device'}
          >
            {mode === 'cloud' ? 'Synced' : 'Local'}
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
