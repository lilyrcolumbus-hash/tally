import { useMemo } from 'react'
import { useEntries } from '@/contexts/EntriesContext'
import { categoryById } from '@/config/categories'
import { formatCurrency, currentMonthKey, monthKey, dominantCurrency, monthlyFinance } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { AlertTriangle, TrendingUp, TrendingDown, Scale } from 'lucide-react'

export function StatsPage() {
  const { entries } = useEntries()
  const thisMonth = currentMonthKey()
  const currency = useMemo(
    () => dominantCurrency(entries.filter((e) => e.type === 'income' || e.type === 'expense')),
    [entries],
  )

  const finance = useMemo(() => monthlyFinance(entries, currency, thisMonth), [entries, currency, thisMonth])

  const monthExpenses = useMemo(
    () =>
      entries.filter(
        (e) => e.type === 'expense' && e.currency === currency && monthKey(e.createdAt) === thisMonth,
      ),
    [entries, thisMonth, currency],
  )

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
      {/* Net profit hero */}
      <Card className="px-4 py-5">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Scale size={13} /> Net profit · {monthLabel}
        </p>
        <p
          className={`mt-1 text-3xl font-extrabold ${finance.net >= 0 ? 'text-success' : 'text-danger'}`}
        >
          {finance.net >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(finance.net), currency)}
        </p>
        <p className="mt-1 text-xs text-ink-600">Earnings minus expenses</p>
      </Card>

      {/* Earned vs spent */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-3 py-3">
          <p className="flex items-center gap-1 text-xs text-ink-500">
            <TrendingUp size={12} /> Earned
          </p>
          <p className="mt-1 text-xl font-bold text-success">{formatCurrency(finance.income, currency)}</p>
        </Card>
        <Card className="px-3 py-3">
          <p className="flex items-center gap-1 text-xs text-ink-500">
            <TrendingDown size={12} /> Spent
          </p>
          <p className="mt-1 text-xl font-bold text-gold-300">{formatCurrency(finance.expense, currency)}</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Spending by category</h2>
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
                  <span className="font-semibold text-danger">
                    {e.quantity} {e.unit || 'left'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
