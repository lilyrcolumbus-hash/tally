import type { EntryDraft, EntryType } from '@/types'
import { CATEGORIES, subcategoriesFor } from '@/config/categories'
import { Package, Wallet, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EntryFormProps {
  draft: EntryDraft
  currency: string
  onChange: (next: EntryDraft) => void
}

function numOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function EntryForm({ draft, currency, onChange }: EntryFormProps) {
  const setType = (type: EntryType) => onChange({ ...draft, type })

  const recompute = (next: EntryDraft): EntryDraft => {
    if (next.quantity !== null && next.unitPrice !== null) {
      return { ...next, total: Math.round(next.quantity * next.unitPrice * 100) / 100 }
    }
    return next
  }

  return (
    <div className="space-y-3">
      {/* Type toggle */}
      <div className="grid grid-cols-3 gap-2">
        {(['income', 'expense', 'inventory'] as const).map((t) => {
          const Icon = t === 'inventory' ? Package : t === 'income' ? Coins : Wallet
          const active = draft.type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium capitalize transition-colors',
                active
                  ? 'border-gold-500 bg-gold-500/10 text-gold-300'
                  : 'border-ink-700 bg-ink-800 text-ink-400',
              )}
            >
              <Icon size={15} />
              {t}
            </button>
          )
        })}
      </div>

      {/* Product */}
      <Field label="Product (optional)">
        <input
          value={draft.product ?? ''}
          onChange={(e) => onChange({ ...draft, product: e.target.value || null })}
          placeholder="e.g. Coffee — leave empty for a plain expense"
          className={inputClass}
        />
      </Field>

      {/* Category — tap to pick (pulses when the AI was unsure) */}
      <div>
        <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-400">
          Category
          {!draft.category && <span className="font-semibold text-gold-400">· which one?</span>}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = draft.category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ ...draft, category: c.id, subcategory: null })}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'border-gold-500 bg-gold-500/15 text-gold-300'
                    : !draft.category
                      ? 'animate-pulse border-gold-500/40 bg-ink-800 text-ink-300'
                      : 'border-ink-700 bg-ink-800 text-ink-400',
                )}
              >
                {c.emoji} {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Subcategory — chips for the chosen category + free text */}
      {draft.category && (
        <Field label="Subcategory / product line (optional)">
          {subcategoriesFor(draft.category).length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {subcategoriesFor(draft.category).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ ...draft, subcategory: draft.subcategory === s ? null : s })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    draft.subcategory === s
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                      : 'border-ink-700 bg-ink-800 text-ink-400',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            value={draft.subcategory ?? ''}
            onChange={(e) => onChange({ ...draft, subcategory: e.target.value || null })}
            placeholder="e.g. Shiitake, Garden, Tally…"
            className={inputClass}
          />
        </Field>
      )}

      {/* Quantity + Unit of measure */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantity">
          <input
            inputMode="decimal"
            value={draft.quantity ?? ''}
            onChange={(e) => onChange(recompute({ ...draft, quantity: numOrNull(e.target.value) }))}
            placeholder="—"
            className={inputClass}
          />
        </Field>
        <Field label="Unit">
          <input
            value={draft.unit ?? ''}
            onChange={(e) => onChange({ ...draft, unit: e.target.value || null })}
            placeholder="lb, kg, box…"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Unit price */}
      <Field label={`Unit price (${currency})`}>
        <input
          inputMode="decimal"
          value={draft.unitPrice ?? ''}
          onChange={(e) => onChange(recompute({ ...draft, unitPrice: numOrNull(e.target.value) }))}
          placeholder="—"
          className={inputClass}
        />
      </Field>

      {/* Total */}
      <Field label={`Total (${currency})`}>
        <input
          inputMode="decimal"
          value={draft.total ?? ''}
          onChange={(e) => onChange({ ...draft, total: numOrNull(e.target.value) })}
          placeholder="—"
          className={cn(inputClass, 'font-semibold text-gold-300')}
        />
      </Field>

      {/* Note */}
      <Field label="Note (optional)">
        <input
          value={draft.note ?? ''}
          onChange={(e) => onChange({ ...draft, note: e.target.value || null })}
          placeholder="Anything to remember"
          className={inputClass}
        />
      </Field>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 placeholder:text-ink-600 outline-none focus:border-gold-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-400">{label}</span>
      {children}
    </label>
  )
}
