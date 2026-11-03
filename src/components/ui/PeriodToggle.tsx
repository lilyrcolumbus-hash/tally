import type { Period } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs">
      {(['week', 'month'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors',
            value === p ? 'bg-gold-500 text-ink-950' : 'text-ink-400 hover:text-ink-300',
          )}
        >
          {p === 'week' ? 'This week' : 'This month'}
        </button>
      ))}
    </div>
  )
}
