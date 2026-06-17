import { useMemo } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { formatCurrency, currentMonthKey, monthKey } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

export function ExpensesPage() {
  const { entries } = useEntries()

  const expenses = useMemo(() => entries.filter((e) => e.type === 'expense'), [entries])
  const currency = expenses[0]?.currency ?? 'USD'

  const thisMonth = currentMonthKey()
  const monthTotal = expenses
    .filter((e) => monthKey(e.createdAt) === thisMonth)
    .reduce((sum, e) => sum + (e.total ?? 0), 0)
  const allTotal = expenses.reduce((sum, e) => sum + (e.total ?? 0), 0)

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

      <EntryList entries={expenses} emptyText="No expenses yet. Add one in '💸 Expense' mode on Home." />
    </div>
  )
}
