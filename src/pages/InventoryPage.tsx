import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Entry } from '@/types'
import { useEntries } from '@/contexts/EntriesContext'
import { MAIN_CATEGORIES, categoryById, normalizeCategoryId } from '@/config/categories'
import { EntryCard } from '@/components/EntryCard'
import { EditEntrySheet } from '@/components/EditEntrySheet'
import { cn } from '@/lib/utils'

interface StockProduct {
  key: string
  product: string
  subcategory: string | null
  unit: string | null
  netQty: number
  entries: Entry[]
}

export function InventoryPage() {
  const { entries, update, remove } = useEntries()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const order = [...MAIN_CATEGORIES.map((c) => c.id), 'other']
    // Build net stock per (category, product)
    const catMap = new Map<string, Map<string, StockProduct>>()
    for (const e of entries) {
      if (e.type !== 'inventory' || !e.product?.trim()) continue
      const cid = normalizeCategoryId(e.category)
      if (filter !== 'all' && cid !== filter) continue
      const prodMap = catMap.get(cid) ?? new Map<string, StockProduct>()
      const key = `${cid}::${e.product}`
      const row = prodMap.get(key) ?? { key, product: e.product, subcategory: e.subcategory, unit: e.unit, netQty: 0, entries: [] }
      row.netQty += e.quantity ?? 0
      row.entries.push(e)
      if (!row.unit && e.unit) row.unit = e.unit
      prodMap.set(key, row)
      catMap.set(cid, prodMap)
    }
    // Subtract consumptions
    for (const e of entries) {
      if (!e.isConsumption || e.type !== 'expense' || !e.product?.trim()) continue
      const cid = normalizeCategoryId(e.category)
      if (filter !== 'all' && cid !== filter) continue
      const prodMap = catMap.get(cid)
      if (!prodMap) continue
      const key = `${cid}::${e.product}`
      const row = prodMap.get(key)
      if (!row) continue
      row.netQty -= e.quantity ?? 0
    }
    return order
      .filter((id) => catMap.has(id))
      .map((id) => ({ id, products: [...(catMap.get(id)!.values())] }))
  }, [entries, filter])

  const handleDelete = async (entry: Entry) => {
    try {
      await remove(entry)
      toast.success('Deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const handleSave = async (entry: Entry) => {
    try {
      await update(entry)
      toast.success('Updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const pills = [{ id: 'all', label: 'All', color: '#F9AB00', emoji: '' }, ...MAIN_CATEGORIES]

  return (
    <div className="space-y-4">
      <div className="fade-right -mx-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
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
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-600">No products yet. Add items with a name on Home.</p>
      ) : (
        groups.map((g) => {
          const cat = categoryById(g.id)
          return (
            <section key={g.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {cat.emoji} {cat.label}
              </h2>
              <div className="space-y-2">
                {g.products.map((p) => (
                  <div key={p.key}>
                    <button
                      className="flex w-full items-center justify-between rounded-2xl border border-ink-800 bg-ink-900/70 px-3 py-3 text-left"
                      onClick={() => setExpanded((prev) => {
                        const next = new Set(prev)
                        next.has(p.key) ? next.delete(p.key) : next.add(p.key)
                        return next
                      })}
                    >
                      <span className="text-sm font-semibold text-ink-300">{p.product}</span>
                      <span className="text-sm font-bold text-[#4285F4]">
                        {Math.round(p.netQty * 1000) / 1000} {p.unit || 'u.'}
                      </span>
                    </button>
                    {expanded.has(p.key) && (
                      <div className="mt-1 space-y-1 pl-2">
                        {p.entries.map((e) => (
                          <EntryCard key={e.id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}

      <EditEntrySheet entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
    </div>
  )
}
