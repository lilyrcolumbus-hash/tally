// Core data model for Tally

export type EntryType = 'inventory' | 'expense' | 'income'
export type EntrySource = 'voice' | 'photo' | 'text'

/** One record: either a stock item (inventory) or a money outflow (expense). */
export interface Entry {
  id: string
  type: EntryType
  /** Product/item name (in English). Null is allowed for an expense with no named product. */
  product: string | null
  category: string
  /** Subcategory / product line within the category (Shiitake, Garden, Tally…). */
  subcategory: string | null
  /** Units held (inventory). Null for pure expenses. */
  quantity: number | null
  /** Unit of measure (lb, kg, liter, box, piece…) in the user's words. */
  unit: string | null
  /** Price per unit. Null when unknown. */
  unitPrice: number | null
  /** Total money: quantity * unitPrice, or a directly stated amount. */
  total: number | null
  currency: string
  note: string | null
  source: EntrySource
  /** Alert when quantity drops to/below this (inventory only). */
  lowStockThreshold: number | null
  createdAt: string
}

/** What the AI (or fallback parser) returns before the user confirms. */
export interface EntryDraft {
  type: EntryType
  product: string | null
  category: string
  subcategory: string | null
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  total: number | null
  note: string | null
  /** Optional low-stock alert threshold (inventory only). Overrides the global default when set. */
  lowStockThreshold?: number | null
  /** Optional override date (YYYY-MM-DD). If absent, save uses current time. */
  date?: string
}

/** Multiple drafts (e.g. a receipt photo with several line items). */
export interface ExtractionResult {
  drafts: EntryDraft[]
  /** Honest flag: true when produced by the offline fallback, not real AI. */
  usedFallback: boolean
}

function fallbackId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

export function generateId(): string {
  return fallbackId()
}
