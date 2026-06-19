import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CapturePanel } from '@/components/capture/CapturePanel'
import { EntryList } from '@/components/EntryList'
import { Card } from '@/components/ui/Card'
import { useEntries } from '@/contexts/EntriesContext'
import { MAIN_CATEGORIES, normalizeCategoryId } from '@/config/categories'
import { dominantCurrency, financeForPeriod, formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function HomePage() {
  const { entries, loading, error } = useEntries()
  const recent = entries.slice(0, 8)

  const currency = useMemo(
    () => dominantCurrency(entries.filter((e) => e.type === 'income' || e.type === 'expense')),
    [entries],
  )

  const perCategory = useMemo(
    () =>
      MAIN_CATEGORIES.map((c) => {
        const mine = entries.filter((e) => normalizeCategoryId(e.category) === c.id)
        return { cat: c, ...financeForPeriod(mine, currency, 'month') }
      }),
    [entries, currency],
  )

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long' })

  return (
    <div className="space-y-5">
      {/* This month, by project */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          {monthLabel} · net by project
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {perCategory.map(({ cat, income, expense, net }) => (
            <Link key={cat.id} to={`/category/${cat.id}`}>
            <Card className="px-3 py-2.5" style={{ background: `${cat.color}1a`, boxShadow: `inset 3px 0 0 ${cat.color}` }}>
              <p className="text-xs font-medium text-ink-300">
                {cat.emoji} {cat.label}
              </p>
              <p className={`text-base font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                {net >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(net), currency)}
              </p>
              <p className="text-[10px] text-ink-600">
                <span className="text-success">{formatCurrency(income, currency)}</span> ·{' '}
                <span className="text-danger">{formatCurrency(expense, currency)}</span>
              </p>
            </Card>
            </Link>
          ))}
        </div>
      </section>

      <CapturePanel />

      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent</h2>
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-600">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : (
          <EntryList entries={recent} emptyText="Add your first item above — speak, snap a receipt, or type." />
        )}
      </section>
    </div>
  )
}
