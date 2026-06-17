import { NavLink } from 'react-router-dom'
import { Home, Package, Wallet, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/inventory', label: 'Inventory', icon: Package, end: false },
  { to: '/expenses', label: 'Expenses', icon: Wallet, end: false },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: false },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-ink-800 bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-gold-400' : 'text-ink-600 hover:text-ink-400',
              )
            }
          >
            <Icon size={22} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
