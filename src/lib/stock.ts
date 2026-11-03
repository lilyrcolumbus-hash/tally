import type { Entry } from '@/types'

export interface StockItem {
  /** category::product (product lowercased) — stable identity, case-insensitive. */
  key: string
  category: string
  /** Display name — the casing of the first entry seen for this product. */
  product: string
  /** The subcategory/family most of this product's entries use (for display grouping). */
  family: string | null
  unit: string | null
  netQty: number
  netValue: number
  lowStockThreshold: number | null
  entries: Entry[]
}

/**
 * Single source of truth for "how much of this do I actually have left."
 * Previously InventoryPage, StatsPage and CategoryDetailPage each computed
 * this independently, with different bugs: none of them subtracted sold
 * (income) quantity, and matching consumption back to the right product
 * broke silently whenever an entry's subcategory didn't exactly match the
 * original purchase's. This version matches purchases/sales/consumption by
 * category + product name only (case-insensitive) — the one thing every
 * entry for the same real-world item always shares.
 */
export function computeStock(entries: Entry[], opts?: { category?: string; currency?: string }): StockItem[] {
  const items = new Map<string, StockItem>()
  const keyFor = (category: string, product: string) => `${category}::${product.trim().toLowerCase()}`

  const inScope = (e: Entry) => {
    if (!e.product?.trim()) return false
    if (opts?.category && opts.category !== 'all' && e.category !== opts.category) return false
    if (opts?.currency && e.currency !== opts.currency) return false
    return true
  }

  // Pass 1: purchases — establishes each product's identity, display name and family.
  for (const e of entries) {
    if (e.type !== 'inventory' || !inScope(e)) continue
    const product = e.product!.trim()
    const key = keyFor(e.category, product)
    const item = items.get(key) ?? {
      key,
      category: e.category,
      product,
      family: null,
      unit: null,
      netQty: 0,
      netValue: 0,
      lowStockThreshold: null,
      entries: [],
    }
    item.netQty += e.quantity ?? 0
    item.netValue += e.total ?? 0
    if (!item.unit && e.unit) item.unit = e.unit
    // Prefer a real stage/family name over the flat fallback (product-as-family)
    // left by older or subcategory-less entries, so the same product doesn't
    // get rendered as its own group AND a member of its real family.
    const subcat = e.subcategory?.trim()
    if (subcat && (!item.family || item.family === product)) item.family = subcat
    if (!item.family) item.family = product
    if (e.lowStockThreshold != null) {
      item.lowStockThreshold =
        item.lowStockThreshold == null ? e.lowStockThreshold : Math.max(item.lowStockThreshold, e.lowStockThreshold)
    }
    item.entries.push(e)
    items.set(key, item)
  }

  // Pass 2: consumption (own stock eaten/used/discarded) reduces quantity and value.
  for (const e of entries) {
    if (e.type !== 'expense' || !e.isConsumption || !inScope(e)) continue
    const item = items.get(keyFor(e.category, e.product!.trim()))
    if (!item) continue
    item.netQty -= e.quantity ?? 0
    item.netValue -= e.total ?? 0
  }

  // Pass 3: sales reduce physical quantity. Not value — an income entry's
  // total is sale revenue, not the cost basis of what left the shelf, and we
  // don't track weighted-average cost, so subtracting it would understate
  // stock value by more than what actually left.
  for (const e of entries) {
    if (e.type !== 'income' || !inScope(e)) continue
    const item = items.get(keyFor(e.category, e.product!.trim()))
    if (!item) continue
    item.netQty -= e.quantity ?? 0
  }

  return [...items.values()]
}
