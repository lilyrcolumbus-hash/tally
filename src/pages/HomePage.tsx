import { useMemo } from 'react'
import { CapturePanel } from '@/components/capture/CapturePanel'
import { EntryList } from '@/components/EntryList'
import { Card } from '@/components/ui/Card'
import { useEntries } from '@/contexts/EntriesContext'
import { dominantCurrency, monthlyFinance, currentMonthKey, formatCurrency } from '@/lib/utils'
import { Loader2, AlertTriangle } from 'lucide-react'

export function HomePage() {
  const { entries, loading, error } = useEntries()
  const recent = entries.slice(0, 8)

  const currency = useMemo(
    () => dominantCurrency(entries.filter((e) => e.type === 'income' || e.type === 'expense')),
    [entries],
  )
  const finance = useMemo(() => monthlyFinance(entries, currency, currentMonthKey()), [entries, currency])
  const lowStockCount = entries.filter(
    (e) =>
      e.type === 'inventory' &&
      e.quantity !== null &&
      e.lowStockThreshold !== null &&
      e.quantity <= e.lowStockThreshold,
  ).length

  return (
    <div className="space-y-5">
      {/* Essentials this month */}
      <Card className="px-3 py-3">
        <div className="grid grid-cols-3 divide-x divide-ink-800 text-center">
          <div>
            <p className="text-[11px] text-ink-500">Earned</p>
            <p className="text-sm font-bold text-success">{formatCurrency(finance.income, currency)}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-500">Spent</p>
            <p className="text-sm font-bold text-gold-300">{formatCurrency(finance.expense, currency)}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-500">Net</p>
            <p className={`text-sm font-bold ${finance.net >= 0 ? 'text-success' : 'text-danger'}`}>
              {finance.net >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(finance.net), currency)}
            </p>
          </div>
        </div>
        {lowStockCount > 0 && (
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-danger">
            <AlertTriangle size={11} /> {lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on stock
          </p>
        )}
      </Card>

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
