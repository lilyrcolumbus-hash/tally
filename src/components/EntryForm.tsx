import { useMemo, useState } from 'react'
import type { EntryDraft, EntryType } from '@/types'
import { CATEGORIES, subcategoriesFor } from '@/config/categories'
import { Package, Wallet, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntries } from '@/contexts/EntriesContext'

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

function scrollIntoCenter(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function EntryForm({ draft, currency, onChange }: EntryFormProps) {
  const { entries } = useEntries()
  const isInv = draft.type === 'inventory'

  // Known product families (subcategories + products as fallback) for datalist
  const knownFamilies = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) {
      if (e.subcategory?.trim()) set.add(e.subcategory.trim())
      if (e.product?.trim()) set.add(e.product.trim())
    }
    // Also add preset subcategories from categories config
    for (const c of CATEGORIES) {
      for (const s of c.subcategories) set.add(s)
    }
    return [...set].sort()
  }, [entries])

  // Known components for the current family
  const knownComponents = useMemo(() => {
    const set = new Set<string>()
    const currentFamily = draft.subcategory?.trim().toLowerCase()
    for (const e of entries) {
      if (!e.product?.trim()) continue
      const entryFamily = (e.subcategory?.trim() || e.product.trim()).toLowerCase()
      if (!currentFamily || entryFamily === currentFamily) set.add(e.product.trim())
    }
    return [...set].sort()
  }, [entries, draft.subcategory])

  const setType = (type: EntryType) => onChange({ ...draft, type })

  // Raw string state so decimal points aren't swallowed mid-typing (e.g. "1." → 1)
  const [raw, setRaw] = useState<Record<string, string>>({})

  function decimalProps(
    field: string,
    draftValue: number | null | undefined,
    onNumChange: (n: number | null) => void
  ) {
    return {
      inputMode: 'decimal' as const,
      value: raw[field] !== undefined ? raw[field] : String(draftValue ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setRaw(r => ({ ...r, [field]: e.target.value }))
        onNumChange(numOrNull(e.target.value))
      },
      onBlur: () => setRaw(r => { const n = { ...r }; delete n[field]; return n }),
    }
  }

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
                active ? 'border-gold-500 bg-gold-500/10 text-gold-300' : 'border-ink-700 bg-ink-800 text-ink-400',
              )}
            >
              <Icon size={15} />
              {t}
            </button>
          )
        })}
      </div>

      {isInv ? (
        <>
          {/* INVENTORY: Product family first, then component */}
          <Field label="Product family">
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
              list="family-suggestions"
              autoComplete="off"
              value={draft.subcategory ?? ''}
              onChange={(e) => onChange({ ...draft, subcategory: e.target.value || null })}
              onFocus={scrollIntoCenter}
              placeholder="e.g. Hummingbird Nectar, Oyster Mushrooms…"
              className={inputClass}
            />
            <datalist id="family-suggestions">
              {knownFamilies.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>

          <Field label="Component / Item">
            <input
              list="component-suggestions"
              autoComplete="off"
              value={draft.product ?? ''}
              onChange={(e) => onChange({ ...draft, product: e.target.value || null })}
              onFocus={scrollIntoCenter}
              placeholder="e.g. Bags, Labels, Sugar, Seeds, Fresh, Dried…"
              className={inputClass}
            />
            <datalist id="component-suggestions">
              {knownComponents.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </>
      ) : (
        <>
          {/* NON-INVENTORY: original product + subcategory order */}
          <Field label="Product (optional)">
            <input
              list="product-suggestions"
              autoComplete="off"
              value={draft.product ?? ''}
              onChange={(e) => onChange({ ...draft, product: e.target.value || null })}
              onFocus={scrollIntoCenter}
              placeholder="e.g. Coffee — leave empty for a plain expense"
              className={inputClass}
            />
            <datalist id="product-suggestions">
              {knownComponents.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </>
      )}

      {/* Category */}
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
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? ''
                    : !draft.category
                      ? 'animate-pulse border-white/20 bg-white/5 text-ink-300'
                      : 'border-white/10 bg-white/5 text-ink-400',
                )}
                style={
                  active
                    ? { background: `${c.color}22`, borderColor: c.color, color: c.color, boxShadow: `0 0 14px ${c.color}44` }
                    : undefined
                }
              >
                {c.emoji} {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Subcategory for non-inventory */}
      {!isInv && draft.category && (
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
            onFocus={scrollIntoCenter}
            placeholder="e.g. Shiitake, Garden, Tally…"
            className={inputClass}
          />
        </Field>
      )}

      {/* Quantity + Unit */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantity">
          <input
            {...decimalProps('quantity', draft.quantity, n => onChange(recompute({ ...draft, quantity: n })))}
            onFocus={scrollIntoCenter}
            placeholder="—"
            className={inputClass}
          />
        </Field>
        <Field label="Unit">
          <input
            value={draft.unit ?? ''}
            onChange={(e) => onChange({ ...draft, unit: e.target.value || null })}
            onFocus={scrollIntoCenter}
            placeholder="lb, kg, bag, label…"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Unit price */}
      <Field label={`Unit price (${currency})`}>
        <input
          {...decimalProps('unitPrice', draft.unitPrice, n => onChange(recompute({ ...draft, unitPrice: n })))}
          onFocus={scrollIntoCenter}
          placeholder="—"
          className={inputClass}
        />
      </Field>

      {/* Total */}
      <Field label={`Total (${currency})`}>
        <input
          {...decimalProps('total', draft.total, n => onChange({ ...draft, total: n }))}
          onFocus={scrollIntoCenter}
          placeholder="—"
          className={cn(inputClass, 'font-semibold text-gold-300')}
        />
      </Field>

      {/* Date */}
      <Field label="Date">
        <input
          type="date"
          value={draft.date ?? ''}
          onChange={(e) => onChange({ ...draft, date: e.target.value || undefined })}
          onFocus={scrollIntoCenter}
          className={inputClass}
        />
      </Field>

      {/* Low-stock threshold — inventory only */}
      {isInv && (
        <Field label="Low-stock alert (units)">
          <input
            {...decimalProps('lowStockThreshold', draft.lowStockThreshold, n => onChange({ ...draft, lowStockThreshold: n }))}
            onFocus={scrollIntoCenter}
            placeholder="Alert when stock drops below this number"
            className={inputClass}
          />
        </Field>
      )}

      {/* Supplier + Batch — show for inventory; also visible for any entry that already has them */}
      {(isInv || draft.supplier || draft.batchId) && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Supplier">
            <input
              value={draft.supplier ?? ''}
              onChange={(e) => onChange({ ...draft, supplier: e.target.value || null })}
              onFocus={scrollIntoCenter}
              placeholder="e.g. Sysco, Costco…"
              className={inputClass}
            />
          </Field>
          <Field label="Batch / Lot #">
            <input
              value={draft.batchId ?? ''}
              onChange={(e) => onChange({ ...draft, batchId: e.target.value || null })}
              onFocus={scrollIntoCenter}
              placeholder="LOT-001, SKU…"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* Note */}
      <Field label="Note (optional)">
        <input
          value={draft.note ?? ''}
          onChange={(e) => onChange({ ...draft, note: e.target.value || null })}
          onFocus={scrollIntoCenter}
          placeholder="Anything to remember"
          className={inputClass}
        />
      </Field>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm text-ink-300 placeholder:text-ink-600 outline-none backdrop-blur-sm focus:border-gold-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-400">{label}</span>
      {children}
    </label>
  )
}
