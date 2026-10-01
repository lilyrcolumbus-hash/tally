import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useEntries } from '@/contexts/EntriesContext'
import { categoryById } from '@/config/categories'
import { dominantCurrency, financeForPeriod, formatCurrency, type Period } from '@/lib/utils'
import { computeStock } from '@/lib/stock'
import { Card } from '@/components/ui/Card'
import { PeriodToggle } from '@/components/ui/PeriodToggle'
import { EntryList } from '@/components/EntryList'

export function CategoryDetailPage() {
  const { id = '' } = useParams()
  const { entries } = useEntries()
  const [period, setPeriod] = useState<Period>('month')
  const cat = categoryById(id)

  const mine = useMemo(() => entries.filter((e) => e.category === id), [entries, id])
  const currency = dominantCurrency(mine.filter((e) => e.type === 'income' || e.type === 'expense'))
  const finance = useMemo(() => financeForPeriod(mine, currency, period), [mine, currency, period])

  const stock = useMemo(() => computeStock(mine, { category: id, currency }), [mine, id, currency])
  const stockValue = useMemo(() => stock.reduce((sum, item) => sum + item.netValue, 0), [stock])
  const inventory = useMemo(
    () => stock.map((item) => ({ name: item.product, qty: item.netQty, value: item.netValue, unit: item.unit })),
    [stock],
  )

  return (
    <div className="space-y-4">
      <Link to="/stats" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-300">
        <ChevronLeft size={16} /> Back to stats
      </Link>

      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
          style={{ background: `${cat.color}22`, boxShadow: `0 0 18px ${cat.color}33` }}
        >
          {cat.emoji}
        </span>
        <h1 className="text-lg font-bold text-ink-300">{cat.label}</h1>
      </div>

      <PeriodToggle value={period} onChange={setPeriod} />

      <Card className="px-4 py-4">
        <p className="text-xs text-ink-500">Net profit · {period === 'week' ? 'this week' : 'this month'}</p>
        <p className={`mt-1 text-2xl font-extrabold ${finance.net >= 0 ? 'text-success' : 'text-danger'}`}>
          {finance.net >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(finance.net), currency)}
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="px-2 py-3 text-center">
          <p className="text-[10px] text-ink-500">Sold</p>
          <p className="text-sm font-bold text-success">{formatCurrency(finance.income, currency)}</p>
        </Card>
        <Card className="px-2 py-3 text-center">
          <p className="text-[10px] text-ink-500">Costs</p>
          <p className="text-sm font-bold text-gold-300">{formatCurrency(finance.expense, currency)}</p>
        </Card>
        <Card className="px-2 py-3 text-center">
          <p className="text-[10px] text-ink-500">Stock value</p>
          <p className="text-sm font-bold text-ink-300">{formatCurrency(stockValue, currency)}</p>
        </Card>
      </div>

      {inventory.length > 0 && (
        <Card className="px-3 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Stock by product</p>
          <div className="space-y-1">
            {inventory.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-ink-400">{item.name}</span>
                <span className="text-ink-500">
                  {item.qty} {item.unit || 'u.'} · {formatCurrency(item.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">All entries</h2>
        <EntryList entries={mine} emptyText="Nothing in this category yet." />
      </section>
    </div>
  )
}
