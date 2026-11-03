import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Entry } from '@/types'
import { EntryCard } from '@/components/EntryCard'
import { EditEntrySheet } from '@/components/EditEntrySheet'
import { useEntries } from '@/contexts/EntriesContext'

interface EntryListProps {
  entries: Entry[]
  emptyText?: string
}

export function EntryList({ entries, emptyText = 'Nothing here yet.' }: EntryListProps) {
  const { update, remove } = useEntries()
  const [editing, setEditing] = useState<Entry | null>(null)

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

  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-600">{emptyText}</p>
  }

  return (
    <>
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onEdit={setEditing} onDelete={handleDelete} />
        ))}
      </div>
      <EditEntrySheet entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
    </>
  )
}
