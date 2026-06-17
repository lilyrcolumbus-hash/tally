import { useEffect, useState } from 'react'
import type { Entry, EntryDraft } from '@/types'
import { Sheet } from '@/components/ui/Sheet'
import { EntryForm } from '@/components/EntryForm'
import { Button } from '@/components/ui/Button'
import { Check } from 'lucide-react'

interface EditEntrySheetProps {
  entry: Entry | null
  onSave: (entry: Entry) => Promise<void>
  onClose: () => void
}

function toDraft(entry: Entry): EntryDraft {
  return {
    type: entry.type,
    product: entry.product,
    category: entry.category,
    quantity: entry.quantity,
    unitPrice: entry.unitPrice,
    total: entry.total,
    note: entry.note,
  }
}

export function EditEntrySheet({ entry, onSave, onClose }: EditEntrySheetProps) {
  const [draft, setDraft] = useState<EntryDraft | null>(entry ? toDraft(entry) : null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(entry ? toDraft(entry) : null)
  }, [entry])

  const handleSave = async () => {
    if (!entry || !draft) return
    setSaving(true)
    const updated: Entry = {
      ...entry,
      type: draft.type,
      product: draft.product,
      category: draft.category,
      quantity: draft.quantity,
      unitPrice: draft.unitPrice,
      total: draft.total,
      note: draft.note,
      lowStockThreshold: draft.type === 'inventory' ? (entry.lowStockThreshold ?? 3) : null,
    }
    try {
      await onSave(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={Boolean(entry && draft)}
      title="Edit"
      onClose={onClose}
      footer={
        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Check size={18} />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      }
    >
      {draft && <EntryForm draft={draft} currency={entry?.currency ?? 'USD'} onChange={setDraft} />}
    </Sheet>
  )
}
