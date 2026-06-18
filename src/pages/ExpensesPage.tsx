import { useMemo, useState } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { CATEGORIES, categoryById } from '@/config/categories'
import { formatCurrency, dominantCurrency, financeForPeriod, inPeriod, type Period } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { PeriodToggle } from '@/components/ui/PeriodToggle'
import { cn } from '@/lib/utils'

export function ExpensesPage() {
  const { entries } = useEntries()
  const [period, setPeriod] = useState<Period>('month')
  const [filter, setFilter] = useState<string>('all')

  const money = useMemo(() => entries.filter((e) => e.type === 'expense' || e.type === 'income'), [entries])
  const currency = dominantCurrency(money)

  const catMoney = filter === 'all' ? money : money.filter((e) => e.category === filter)
  const finance = useMemo(() => financeForPeriod(catMoney, currency, period), [catMoney, currency, period])
  const visible = useMemo(() => catMoney.filter((e) => inPeriod(e.createdAt, period)), [catMoney, period])

  const pills = [{ id: 'all', label: 'All', color: '#fbbf24', emoji: '' }, ...CATEGORIES.filter((c) => c.id !== 'other')]

  return (
    <div className="space-y-4">
      <PeriodToggle value={period} onChange={setPeriod} />

      {/* Category filter pills */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
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

      <EntryList
        entries={visible}
        emptyText={
          filter === 'all'
            ? 'No income or expenses in this period. Add one in 💰 Income or 💸 Expense mode on Home.'
            : `Nothing in ${categoryById(filter).label} for this period.`
        }
      />
    </div>
  )
}
