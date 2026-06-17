import { useMemo } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { formatCurrency, currentMonthKey, monthKey, dominantCurrency, hasMixedCurrencies } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

export function ExpensesPage() {
  const { entries } = useEntries()

  const expenses = useMemo(() => entries.filter((e) => e.type === 'expense'), [entries])
  const currency = dominantCurrency(expenses)
  const mixed = hasMixedCurrencies(expenses)
  const inCurrency = expenses.filter((e) => e.currency === currency)

  const thisMonth = currentMonthKey()
  const monthTotal = inCurrency
    .filter((e) => monthKey(e.createdAt) === thisMonth)
    .reduce((sum, e) => sum + (e.total ?? 0), 0)
  const allTotal = inCurrency.reduce((sum, e) => sum + (e.total ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-3 py-3">
          <p className="text-xs text-ink-500">Spent this month</p>
          <p className="text-xl font-bold text-gold-300">{formatCurrency(monthTotal, currency)}</p>
        </Card>
        <Card className="px-3 py-3">
          <p className="text-xs text-ink-500">All time</p>
          <p className="text-xl font-bold text-ink-300">{formatCurrency(allTotal, currency)}</p>
        </Card>
      </div>

      {mixed && (
        <p className="rounded-lg bg-ink-800/60 px-3 py-2 text-[11px] text-ink-500">
          Totals show {currency} only — you have entries in more than one currency.
        </p>
      )}

      <EntryList entries={expenses} emptyText="No expenses yet. Add one in '💸 Expense' mode on Home." />
    </div>
  )
}
