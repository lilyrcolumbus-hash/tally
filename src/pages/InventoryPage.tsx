import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Entry } from '@/types'
import { useEntries } from '@/contexts/EntriesContext'
import { MAIN_CATEGORIES, categoryById, normalizeCategoryId } from '@/config/categories'
import { EntryCard } from '@/components/EntryCard'
import { EditEntrySheet } from '@/components/EditEntrySheet'
import { cn } from '@/lib/utils'

export function InventoryPage() {
  const { entries, update, remove } = useEntries()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Entry | null>(null)

  const withProduct = useMemo(() => entries.filter((e) => e.product && e.product.trim()), [entries])

  const groups = useMemo(() => {
    const order = [...MAIN_CATEGORIES.map((c) => c.id), 'other']
    const map = new Map<string, Entry[]>()
    for (const e of withProduct) {
      const cid = normalizeCategoryId(e.category)
      if (filter !== 'all' && cid !== filter) continue
      const arr = map.get(cid) ?? []
      arr.push(e)
      map.set(cid, arr)
    }
    return order.filter((id) => map.has(id)).map((id) => ({ id, items: map.get(id) as Entry[] }))
  }, [withProduct, filter])

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
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
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
                {g.items.map((e) => (
                  <EntryCard key={e.id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
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
