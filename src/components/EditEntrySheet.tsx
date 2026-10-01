import { useEffect, useState } from 'react'
import type { Entry, EntryDraft } from '@/types'
import { Sheet } from '@/components/ui/Sheet'
import { EntryForm } from '@/components/EntryForm'
import { Button } from '@/components/ui/Button'
import { Check } from 'lucide-react'

// entry.createdAt is a UTC ISO timestamp. Slicing it directly (old code) reads
// the UTC calendar date, which is off by one for anyone behind UTC once the
// local time crosses midnight but UTC hasn't yet (or vice versa) — exactly
// the "date shifts by a day after editing" bug. Use local date components
// instead, both when showing the date in the form and when saving it back.
function toLocalDateInputValue(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateInputToISO(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

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
    subcategory: entry.subcategory,
    quantity: entry.quantity,
    unit: entry.unit,
    unitPrice: entry.unitPrice,
    total: entry.total,
    note: entry.note,
    date: toLocalDateInputValue(entry.createdAt),
    lowStockThreshold: entry.lowStockThreshold,
    isConsumption: entry.isConsumption,
    supplier: entry.supplier,
    batchId: entry.batchId,
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
      subcategory: draft.subcategory,
      quantity: draft.quantity,
      unit: draft.unit,
      unitPrice: draft.unitPrice,
      total: draft.total,
      note: draft.note,
      lowStockThreshold: draft.type === 'inventory' ? (draft.lowStockThreshold ?? entry.lowStockThreshold ?? 3) : null,
      isConsumption: draft.isConsumption ?? entry.isConsumption,
      supplier: draft.supplier ?? null,
      batchId: draft.batchId ?? null,
      createdAt: draft.date ? localDateInputToISO(draft.date) : entry.createdAt,
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
