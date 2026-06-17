import { useMemo } from 'react'
import { useEntries } from '@/contexts/EntriesContext'
import { categoryById } from '@/config/categories'
import { formatCurrency, currentMonthKey, monthKey } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { AlertTriangle, TrendingUp } from 'lucide-react'

export function StatsPage() {
  const { entries } = useEntries()
  const currency = entries[0]?.currency ?? 'USD'
  const thisMonth = currentMonthKey()

  const monthExpenses = useMemo(
    () => entries.filter((e) => e.type === 'expense' && monthKey(e.createdAt) === thisMonth),
    [entries, thisMonth],
  )

  const monthTotal = monthExpenses.reduce((sum, e) => sum + (e.total ?? 0), 0)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of monthExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + (e.total ?? 0))
    }
    return [...map.entries()].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount)
  }, [monthExpenses])

  const maxCat = byCategory[0]?.amount ?? 0

  const lowStock = entries.filter(
    (e) =>
      e.type === 'inventory' &&
      e.quantity !== null &&
      e.lowStockThreshold !== null &&
      e.quantity <= e.lowStockThreshold,
  )

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <Card className="px-4 py-5">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <TrendingUp size={13} /> Spent in {monthLabel}
        </p>
        <p className="mt-1 text-3xl font-extrabold text-gold-300">{formatCurrency(monthTotal, currency)}</p>
        <p className="mt-1 text-xs text-ink-600">{monthExpenses.length} expense entries</p>
      </Card>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">By category</h2>
        {byCategory.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-600">No expenses this month yet.</p>
        ) : (
          <div className="space-y-2.5">
            {byCategory.map(({ id, amount }) => {
              const cat = categoryById(id)
              const pct = maxCat > 0 ? Math.round((amount / maxCat) * 100) : 0
              return (
                <div key={id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-400">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="font-semibold text-ink-300">{formatCurrency(amount, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-500 to-cyan-400"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <AlertTriangle size={13} /> Low stock
        </h2>
        {lowStock.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-600">Everything is well stocked. 👍</p>
        ) : (
          <div className="space-y-2">
            {lowStock.map((e) => {
              const cat = categoryById(e.category)
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm"
                >
                  <span className="text-ink-300">
                    {cat.emoji} {e.product ?? 'Item'}
                  </span>
                  <span className="font-semibold text-danger">{e.quantity} left</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
