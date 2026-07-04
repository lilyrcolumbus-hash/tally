import { useState } from 'react'
import type { Entry } from '@/types'
import { categoryById } from '@/config/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertTriangle, Pencil, Trash2, TrendingUp, TrendingDown, Package, UtensilsCrossed } from 'lucide-react'

const typeIcon = { income: TrendingUp, expense: TrendingDown, inventory: Package }
const typeColor = {
  income: 'text-success',
  expense: 'text-danger',
  inventory: 'text-[#4285F4]',
}

interface EntryCardProps {
  entry: Entry
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const [confirming, setConfirming] = useState(false)
  const cat = categoryById(entry.category)
  const TypeIcon = typeIcon[entry.type]
  const lowStock =
    entry.type === 'inventory' &&
    entry.quantity !== null &&
    entry.lowStockThreshold !== null &&
    entry.quantity <= entry.lowStockThreshold

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900/70 px-3 py-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-lg">
        {cat.emoji}
        <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-950 ${typeColor[entry.type]}`}>
          <TypeIcon size={9} strokeWidth={2.5} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="max-w-[55%] truncate whitespace-nowrap text-sm font-semibold text-ink-300">
            {entry.product ?? <span className="italic text-ink-500">{cat.label}</span>}
          </p>
          {lowStock && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
              <AlertTriangle size={10} /> Low
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-400">
          {entry.isConsumption ? <UtensilsCrossed size={11} className="text-orange-400" /> : <TypeIcon size={11} className={typeColor[entry.type]} />}
          {entry.isConsumption ? <span className="text-orange-400">Consumed</span> : cat.label}
          {entry.subcategory && <span className="text-cyan-300">› {entry.subcategory}</span>}
          {entry.variant && (
            <span className={entry.variant.toLowerCase() === 'magic' ? 'text-purple-300' : 'text-ink-500'}>
              · {entry.variant}
            </span>
          )}
          {entry.quantity !== null && (
            <span>
              · {entry.quantity} {entry.unit || 'u.'}
            </span>
          )}
          <span>· {formatDate(entry.createdAt)}</span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold ${
            entry.type === 'income' ? 'text-success' : entry.type === 'inventory' ? 'text-[#4285F4]' : 'text-danger'
          }`}
        >
          {entry.type === 'income' ? '+ ' : ''}
          {formatCurrency(entry.total, entry.currency)}
        </p>
        {confirming ? (
          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              onClick={() => onDelete(entry)}
              className="text-[11px] font-semibold text-danger"
            >
              Delete
            </button>
            <button onClick={() => setConfirming(false)} className="text-[11px] text-ink-500">
              Cancel
            </button>
          </div>
        ) : (
          <div className="-mb-2 -mr-2 mt-0.5 flex items-center justify-end text-ink-600">
            <button
              onClick={() => onEdit(entry)}
              aria-label="Edit"
              className="flex h-11 w-11 items-center justify-center rounded-lg p-2.5 hover:text-cyan-300 active:bg-white/5"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete"
              className="flex h-11 w-11 items-center justify-center rounded-lg p-2.5 hover:text-danger active:bg-white/5"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
