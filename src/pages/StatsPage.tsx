import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEntries } from '@/contexts/EntriesContext'
import { categoryById, normalizeCategoryId } from '@/config/categories'
import { formatCurrency, dominantCurrency, financeForPeriod, inPeriod, type Period } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { PeriodToggle } from '@/components/ui/PeriodToggle'
import { AlertTriangle, TrendingUp, TrendingDown, Scale, Package, ChevronRight } from 'lucide-react'

interface InvItem {
  name: string
  qty: number
  value: number
  unit: string | null
}

export function StatsPage() {
  const { entries } = useEntries()
  const [period, setPeriod] = useState<Period>('month')
  const periodLabel = period === 'week' ? 'this week' : 'this month'

  const currency = useMemo(
    () => dominantCurrency(entries.filter((e) => e.type === 'income' || e.type === 'expense')),
    [entries],
  )
  const finance = useMemo(() => financeForPeriod(entries, currency, period), [entries, currency, period])

  // Money by category (this period) — each project's mini P&L
  const byCategory = useMemo(() => {
    const map = new Map<string, { earned: number; spent: number }>()
    for (const e of entries) {
      if (e.currency !== currency || !inPeriod(e.createdAt, period)) continue
      if (e.type !== 'income' && e.type !== 'expense') continue
      const cid = normalizeCategoryId(e.category)
      const c = map.get(cid) ?? { earned: 0, spent: 0 }
      if (e.type === 'income') c.earned += e.total ?? 0
      else c.spent += e.total ?? 0
      map.set(cid, c)
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v, net: v.earned - v.spent }))
      .sort((a, b) => b.earned + b.spent - (a.earned + a.spent))
  }, [entries, currency, period])

  // Inventory grouped by category → subcategory/product (all-time stock)
  const inventoryGroups = useMemo(() => {
    const cats = new Map<string, { value: number; items: Map<string, InvItem> }>()
    for (const e of entries) {
      if (e.type !== 'inventory' || e.currency !== currency) continue
      const cid = normalizeCategoryId(e.category)
      const cat = cats.get(cid) ?? { value: 0, items: new Map<string, InvItem>() }
      const key = e.product || e.subcategory || 'Item'
      const item = cat.items.get(key) ?? { name: key, qty: 0, value: 0, unit: null }
      item.qty += e.quantity ?? 0
      item.value += e.total ?? 0
      if (!item.unit && e.unit) item.unit = e.unit
      cat.items.set(key, item)
      cat.value += e.total ?? 0
      cats.set(cid, cat)
    }
    // Subtract consumed-from-stock expenses
    for (const e of entries) {
      if (!e.isConsumption || e.type !== 'expense' || e.currency !== currency) continue
      const cid = normalizeCategoryId(e.category)
      const cat = cats.get(cid)
      if (!cat) continue
      const key = e.product || e.subcategory || 'Item'
      const item = cat.items.get(key)
      if (!item) continue
      item.qty -= e.quantity ?? 0
      item.value -= e.total ?? 0
      cat.value -= e.total ?? 0
    }
    return [...cats.entries()].map(([id, d]) => ({ id, value: d.value, items: [...d.items.values()] }))
  }, [entries, currency])

  const lowStock = entries.filter(
    (e) =>
      e.type === 'inventory' &&
      e.quantity !== null &&
      e.lowStockThreshold !== null &&
      e.quantity <= e.lowStockThreshold,
  )

  return (
    <div className="space-y-5">
      <PeriodToggle value={period} onChange={setPeriod} />

      {/* Net profit hero */}
      <Card className="px-4 py-5">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Scale size={13} /> Net profit · {periodLabel}
        </p>
        <p className={`mt-1 text-3xl font-extrabold ${finance.net >= 0 ? 'text-success' : 'text-danger'}`}>
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
          <p className="mt-1 text-xl font-bold text-danger">{formatCurrency(finance.expense, currency)}</p>
        </Card>
      </div>

      {/* By project / category — tap to drill in */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">By project · {periodLabel}</h2>
        {byCategory.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-600">No money activity {periodLabel} yet.</p>
        ) : (
          <div className="space-y-2">
            {byCategory.map(({ id, earned, spent, net }) => {
              const cat = categoryById(id)
              return (
                <Link key={id} to={`/category/${id}`}>
                  <Card
                    className="flex items-center justify-between px-3 py-2.5"
                    style={{ boxShadow: `inset 3px 0 0 ${cat.color}`, background: `${cat.color}1a` }}
                  >
                    <span className="flex items-center gap-1 text-sm text-ink-300">
                      {cat.emoji} {cat.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                          {net >= 0 ? '+' : '−'}
                          {formatCurrency(Math.abs(net), currency)}
                        </p>
                        <p className="text-[10px] text-ink-600">
                          <span className="text-success">{formatCurrency(earned, currency)}</span> ·{' '}
                          <span className="text-danger">{formatCurrency(spent, currency)}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-ink-600" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Inventory by product */}
      {inventoryGroups.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <Package size={13} /> Inventory by product
          </h2>
          <div className="space-y-3">
            {inventoryGroups.map((group) => {
              const cat = categoryById(group.id)
              return (
                <Card key={group.id} className="px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-300">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="text-sm font-bold text-gold-300">{formatCurrency(group.value, currency)}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="text-ink-400">{item.name}</span>
                        <span className="text-ink-500">
                          {item.qty} {item.unit || 'u.'} · {formatCurrency(item.value, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Low stock */}
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
                    {cat.emoji} {e.subcategory || e.product || 'Item'}
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
