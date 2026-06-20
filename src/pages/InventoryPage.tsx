import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import type { Entry } from '@/types'
import { useEntries } from '@/contexts/EntriesContext'
import { MAIN_CATEGORIES, categoryById, normalizeCategoryId } from '@/config/categories'
import { EntryCard } from '@/components/EntryCard'
import { EditEntrySheet } from '@/components/EditEntrySheet'
import { cn } from '@/lib/utils'

interface StockComponent {
  key: string
  product: string
  unit: string | null
  netQty: number
  lowStockThreshold: number | null
  isLow: boolean
  entries: Entry[]
}

interface StockFamily {
  familyKey: string
  familyName: string
  components: StockComponent[]
}

interface CategoryGroup {
  id: string
  families: StockFamily[]
}

export function InventoryPage() {
  const { entries, update, remove } = useEntries()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo((): CategoryGroup[] => {
    const order = [...MAIN_CATEGORIES.map((c) => c.id), 'other']
    const catMap = new Map<string, Map<string, StockFamily>>()

    for (const e of entries) {
      if (e.type !== 'inventory' || !e.product?.trim()) continue
      const cid = normalizeCategoryId(e.category)
      if (filter !== 'all' && cid !== filter) continue

      const familyName = e.subcategory?.trim() || e.product.trim()
      const componentName = e.product.trim()
      const familyKey = `${cid}::${familyName}`
      const compKey = `${familyKey}::${componentName}`

      const familyMap = catMap.get(cid) ?? new Map<string, StockFamily>()
      const family = familyMap.get(familyKey) ?? { familyKey, familyName, components: [] }

      let comp = family.components.find((c) => c.key === compKey)
      if (!comp) {
        comp = { key: compKey, product: componentName, unit: e.unit, netQty: 0, lowStockThreshold: null, isLow: false, entries: [] }
        family.components.push(comp)
      }
      comp.netQty += e.quantity ?? 0
      comp.entries.push(e)
      if (!comp.unit && e.unit) comp.unit = e.unit
      if (e.lowStockThreshold != null) {
        comp.lowStockThreshold =
          comp.lowStockThreshold == null ? e.lowStockThreshold : Math.max(comp.lowStockThreshold, e.lowStockThreshold)
      }

      familyMap.set(familyKey, family)
      catMap.set(cid, familyMap)
    }

    // Subtract consumptions
    for (const e of entries) {
      if (!e.isConsumption || e.type !== 'expense' || !e.product?.trim()) continue
      const cid = normalizeCategoryId(e.category)
      if (filter !== 'all' && cid !== filter) continue
      const familyMap = catMap.get(cid)
      if (!familyMap) continue
      const familyName = e.subcategory?.trim() || e.product.trim()
      const familyKey = `${cid}::${familyName}`
      const compKey = `${familyKey}::${e.product.trim()}`
      const family = familyMap.get(familyKey)
      if (!family) continue
      const comp = family.components.find((c) => c.key === compKey)
      if (comp) comp.netQty -= e.quantity ?? 0
    }

    // Compute isLow after all qty settled
    for (const familyMap of catMap.values()) {
      for (const family of familyMap.values()) {
        for (const comp of family.components) {
          comp.isLow = comp.lowStockThreshold != null && comp.netQty <= comp.lowStockThreshold
        }
      }
    }

    return order
      .filter((id) => catMap.has(id))
      .map((id) => ({ id, families: [...(catMap.get(id)!.values())] }))
  }, [entries, filter])

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

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
                style={
                  active ? { background: p.color, borderColor: p.color, boxShadow: `0 0 16px ${p.color}55` } : undefined
                }
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
                {g.families.map((family) => {
                  const isFlat =
                    family.components.length === 1 &&
                    family.components[0].product.toLowerCase() === family.familyName.toLowerCase()

                  if (isFlat) {
                    const comp = family.components[0]
                    return (
                      <div key={family.familyKey}>
                        <button
                          className="flex w-full items-center justify-between rounded-2xl border border-ink-800 bg-ink-900/70 px-3 py-3 text-left"
                          onClick={() => toggle(comp.key)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink-300">{comp.product}</span>
                            {comp.isLow && <AlertTriangle size={13} className="text-amber-400" />}
                          </div>
                          <span className={cn('text-sm font-bold', comp.isLow ? 'text-amber-400' : 'text-[#4285F4]')}>
                            {Math.round(comp.netQty * 1000) / 1000} {comp.unit || 'u.'}
                          </span>
                        </button>
                        {comp.isLow && (
                          <p className="mt-0.5 px-3 text-[10px] text-amber-400">
                            Low stock — below {comp.lowStockThreshold} {comp.unit || 'u.'}
                          </p>
                        )}
                        {expanded.has(comp.key) && (
                          <div className="mt-1 space-y-1 pl-2">
                            {comp.entries.map((e) => (
                              <EntryCard key={e.id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Nested: family header + component rows
                  return (
                    <div key={family.familyKey} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70">
                      <div className="border-b border-ink-800/60 px-3 py-2.5">
                        <span className="text-sm font-semibold text-ink-200">{family.familyName}</span>
                      </div>
                      <div className="divide-y divide-ink-800/40">
                        {family.components.map((comp) => (
                          <div key={comp.key}>
                            <button
                              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                              onClick={() => toggle(comp.key)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-ink-300">{comp.product}</span>
                                {comp.isLow && <AlertTriangle size={12} className="text-amber-400" />}
                              </div>
                              <span className={cn('text-sm font-bold', comp.isLow ? 'text-amber-400' : 'text-[#4285F4]')}>
                                {Math.round(comp.netQty * 1000) / 1000} {comp.unit || 'u.'}
                              </span>
                            </button>
                            {comp.isLow && (
                              <p className="px-3 pb-1.5 text-[10px] text-amber-400">
                                Low stock — below {comp.lowStockThreshold} {comp.unit || 'u.'}
                              </p>
                            )}
                            {expanded.has(comp.key) && (
                              <div className="space-y-1 px-2 pb-2">
                                {comp.entries.map((e) => (
                                  <EntryCard key={e.id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })
      )}

      <EditEntrySheet entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
    </div>
  )
}
