import { useMemo, useState } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import type { CategoryDef } from '@/config/categories'
import { getCategories, getMainCategories, categoryById, normalizeCategoryId } from '@/lib/categoryStore'
import { formatCurrency, dominantCurrency, financeForPeriod, inPeriod, type Period, type FinanceSummary } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { PeriodToggle } from '@/components/ui/PeriodToggle'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types'

interface CategoryGroup {
  cat: CategoryDef
  entries: Entry[]
  finance: FinanceSummary
}

export function ExpensesPage() {
  const { entries } = useEntries()
  const [period, setPeriod] = useState<Period>('month')
  const [filter, setFilter] = useState<string>('all')

  const money = useMemo(
    () => entries.filter((e) => e.type === 'expense' || e.type === 'income' || e.type === 'inventory'),
    [entries],
  )
  const currency = dominantCurrency(money)

  const catMoney = filter === 'all' ? money : money.filter((e) => e.category === filter)
  const finance = useMemo(() => financeForPeriod(catMoney, currency, period), [catMoney, currency, period])
  const visible = useMemo(() => catMoney.filter((e) => inPeriod(e.createdAt, period)), [catMoney, period])

  // Never mix categories together: when viewing "All", split into one section
  // per project (each with its own Earned/Spent/Net), instead of one merged list.
  const groups = useMemo((): CategoryGroup[] => {
    if (filter !== 'all') return []
    const order = [...getMainCategories().map((c) => c.id), 'other']
    const byId = new Map<string, Entry[]>()
    for (const e of visible) {
      const cid = normalizeCategoryId(e.category)
      const list = byId.get(cid) ?? []
      list.push(e)
      byId.set(cid, list)
    }
    return order
      .filter((id) => byId.has(id))
      .map((id) => {
        const catEntries = byId.get(id)!
        return { cat: categoryById(id), entries: catEntries, finance: financeForPeriod(catEntries, currency, period) }
      })
  }, [filter, visible, currency, period])

  const pills = [{ id: 'all', label: 'All', color: '#fbbf24', emoji: '' }, ...getCategories().filter((c) => c.id !== 'other')]

  return (
    <div className="space-y-4">
      <PeriodToggle value={period} onChange={setPeriod} />

      {/* Category filter pills */}
      <div className="fade-right -mx-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {pills.map((p) => {
            const active = filter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active ? 'text-ink-950' : 'border-white/10 bg-white/5 text-ink-400',
                )}
                style={active ? { background: p.color, borderColor: p.color, boxShadow: `0 0 16px ${p.color}55` } : undefined}
              >
                {'emoji' in p && p.emoji ? `${p.emoji} ` : ''}
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="px-3 py-3 text-center">
          <p className="text-[11px] text-ink-500">Earned</p>
          <p className="text-base font-bold text-success">{formatCurrency(finance.income, currency)}</p>
        </Card>
        <Card className="px-3 py-3 text-center">
          <p className="text-[11px] text-ink-500">Spent</p>
          <p className="text-base font-bold text-gold-300">{formatCurrency(finance.expense, currency)}</p>
        </Card>
        <Card className="px-3 py-3 text-center">
          <p className="text-[11px] text-ink-500">Net</p>
          <p className={`text-base font-bold ${finance.net >= 0 ? 'text-success' : 'text-danger'}`}>
            {finance.net >= 0 ? '+' : '−'}
            {formatCurrency(Math.abs(finance.net), currency)}
          </p>
        </Card>
      </div>

      {filter === 'all' ? (
        groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-600">
            No income, expenses, or inventory purchases in this period. Add one on Home.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.cat.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {g.cat.emoji} {g.cat.label}
                  </h2>
                  <p className="text-xs text-ink-500">
                    <span className="text-success">{formatCurrency(g.finance.income, currency)}</span>
                    {' · '}
                    <span className="text-gold-300">{formatCurrency(g.finance.expense, currency)}</span>
                    {' · '}
                    <span className={g.finance.net >= 0 ? 'text-success' : 'text-danger'}>
                      {g.finance.net >= 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(g.finance.net), currency)}
                    </span>
                  </p>
                </div>
                <EntryList entries={g.entries} />
              </section>
            ))}
          </div>
        )
      ) : (
        <EntryList entries={visible} emptyText={`Nothing in ${categoryById(filter).label} for this period.`} />
      )}
    </div>
  )
}
