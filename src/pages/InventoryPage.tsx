import { useMemo } from 'react'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { formatCurrency, dominantCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { AlertTriangle } from 'lucide-react'

export function InventoryPage() {
  const { entries } = useEntries()

  const items = useMemo(() => entries.filter((e) => e.type === 'inventory'), [entries])

  const lowStock = items.filter(
    (e) => e.quantity !== null && e.lowStockThreshold !== null && e.quantity <= e.lowStockThreshold,
  )
  const totalUnits = items.reduce((sum, e) => sum + (e.quantity ?? 0), 0)
  const currency = dominantCurrency(items)
  const totalValue = items
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + (e.total ?? 0), 0)

  // Low-stock items float to the top.
  const sorted = [...items].sort((a, b) => {
    const aLow = lowStock.includes(a) ? 0 : 1
    const bLow = lowStock.includes(b) ? 0 : 1
    return aLow - bLow
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-3 py-3">
          <p className="text-xs text-ink-500">Items</p>
          <p className="text-xl font-bold text-ink-300">{items.length}</p>
          <p className="text-[11px] text-ink-600">{totalUnits} units total</p>
        </Card>
        <Card className="px-3 py-3">
          <p className="text-xs text-ink-500">Stock value</p>
          <p className="text-xl font-bold text-gold-300">{formatCurrency(totalValue, currency)}</p>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          <AlertTriangle size={14} />
          {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low
        </div>
      )}

      <EntryList entries={sorted} emptyText="No inventory yet. Add items in '📦 Inventory' mode on Home." />
    </div>
  )
}
