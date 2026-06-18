import { useMemo } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { formatCurrency, currentMonthKey, dominantCurrency, monthlyFinance, hasMixedCurrencies } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

export function ExpensesPage() {
  const { entries } = useEntries()

  const money = useMemo(() => entries.filter((e) => e.type === 'expense' || e.type === 'income'), [entries])
  const currency = dominantCurrency(money)
  const mixed = hasMixedCurrencies(money)
  const finance = useMemo(() => monthlyFinance(entries, currency, currentMonthKey()), [entries, currency])

  return (
    <div className="space-y-4">
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

      {mixed && (
        <p className="rounded-lg bg-ink-800/60 px-3 py-2 text-[11px] text-ink-500">
          Totals show {currency} only — you have entries in more than one currency.
        </p>
      )}

      <EntryList entries={money} emptyText="No income or expenses yet. Add one in 💰 Income or 💸 Expense mode on Home." />
    </div>
  )
}
