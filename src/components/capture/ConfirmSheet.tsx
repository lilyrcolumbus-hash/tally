import { useState, useEffect } from 'react'
import type { Entry, EntryDraft, EntrySource } from '@/types'
import { generateId } from '@/types'
import { Sheet } from '@/components/ui/Sheet'
import { EntryForm } from '@/components/EntryForm'
import { Button } from '@/components/ui/Button'
import { Check, Sparkles, AlertCircle } from 'lucide-react'

interface ConfirmSheetProps {
  open: boolean
  drafts: EntryDraft[]
  source: EntrySource
  currency: string
  lowStockDefault: number
  usedFallback: boolean
  onConfirm: (entries: Entry[]) => Promise<void>
  onClose: () => void
}

export function ConfirmSheet({
  open,
  drafts: initialDrafts,
  source,
  currency,
  lowStockDefault,
  usedFallback,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const [drafts, setDrafts] = useState<EntryDraft[]>(initialDrafts)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDrafts(initialDrafts)
  }, [initialDrafts])

  const updateDraft = (index: number, next: EntryDraft) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? next : d)))

  const removeDraft = (index: number) => setDrafts((prev) => prev.filter((_, i) => i !== index))

  const handleSave = async () => {
    setSaving(true)
    const nowIso = new Date().toISOString()
    const entries: Entry[] = drafts.map((d) => ({
      id: generateId(),
      type: d.type,
      product: d.product,
      category: d.category,
      subcategory: d.subcategory,
      quantity: d.quantity,
      unit: d.unit,
      unitPrice: d.unitPrice,
      total: d.total,
      currency,
      note: d.note,
      source,
      lowStockThreshold: d.type === 'inventory' ? lowStockDefault : null,
      createdAt: nowIso,
    }))
    try {
      await onConfirm(entries)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      title={drafts.length > 1 ? `Confirm ${drafts.length} items` : 'Confirm'}
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={saving || drafts.length === 0 || drafts.some((d) => !d.category)}
        >
          <Check size={18} />
          {saving
            ? 'Saving…'
            : drafts.some((d) => !d.category)
              ? 'Pick a category first'
              : `Save ${drafts.length > 1 ? `${drafts.length} items` : ''}`.trim()}
        </Button>
      }
    >
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
        {usedFallback ? (
          <>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              Demo mode (no AI key). We pulled out the numbers we could — please check and fix anything before saving.
            </span>
          </>
        ) : (
          <>
            <Sparkles size={14} className="mt-0.5 shrink-0" />
            <span>Here&apos;s what we understood. Tap any field to fix it before saving.</span>
          </>
        )}
      </div>

      <div className="space-y-5">
        {drafts.map((draft, i) => (
          <div key={i} className="rounded-2xl border border-ink-800 p-3">
            {drafts.length > 1 && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Item {i + 1}</span>
                <button onClick={() => removeDraft(i)} className="text-[11px] text-danger">
                  Remove
                </button>
              </div>
            )}
            <EntryForm draft={draft} currency={currency} onChange={(next) => updateDraft(i, next)} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}
