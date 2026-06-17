import { useState } from 'react'
import type { Entry } from '@/types'
import { categoryById } from '@/config/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Mic, Camera, Type, AlertTriangle, Pencil, Trash2 } from 'lucide-react'

const sourceIcon = { voice: Mic, photo: Camera, text: Type }

interface EntryCardProps {
  entry: Entry
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const [confirming, setConfirming] = useState(false)
  const cat = categoryById(entry.category)
  const SourceIcon = sourceIcon[entry.source]
  const lowStock =
    entry.type === 'inventory' &&
    entry.quantity !== null &&
    entry.lowStockThreshold !== null &&
    entry.quantity <= entry.lowStockThreshold

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900/70 px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-lg">
        {cat.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-ink-300">
            {entry.product ?? <span className="italic text-ink-400">Unnamed {entry.type}</span>}
          </p>
          {lowStock && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
              <AlertTriangle size={10} /> Low
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-400">
          <SourceIcon size={11} />
          {cat.label}
          {entry.quantity !== null && <span>· {entry.quantity} u.</span>}
          <span>· {formatDate(entry.createdAt)}</span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-gold-300">{formatCurrency(entry.total, entry.currency)}</p>
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
          <div className="mt-1 flex items-center justify-end gap-2 text-ink-600">
            <button onClick={() => onEdit(entry)} aria-label="Edit" className="hover:text-cyan-300">
              <Pencil size={14} />
            </button>
            <button onClick={() => setConfirming(true)} aria-label="Delete" className="hover:text-danger">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
