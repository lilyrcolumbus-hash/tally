import type { CategoryDef } from '@/config/categories'
import { DEFAULT_CATEGORIES } from '@/config/categories'
import type { Entry } from '@/types'

// First visit only: a brand-new browser gets clearly labelled sample data, so the public demo is not empty.
// It never touches a browser that already has entries or categories, and it never leaves the browser.

export const DEMO_ID_PREFIX = 'demo-'
const SEEDED_KEY = 'tally_demo_seeded'
const ENTRIES_KEY = 'tally_entries'
const CATEGORIES_KEY = 'tally_categories'

const SAMPLE_CATEGORIES: CategoryDef[] = [
  { id: 'cafe', label: 'Cafe', emoji: '☕', color: '#c8844a', keywords: ['coffee', 'milk', 'cup'], subcategories: ['Beans', 'Dairy', 'Supplies'] },
  { id: 'bikes', label: 'Bike repair', emoji: '🚲', color: '#00d4c8', keywords: ['tube', 'brake', 'chain'], subcategories: ['Parts', 'Lubricants'] },
  { id: 'art', label: 'Art studio', emoji: '🎨', color: '#ffb800', keywords: ['paint', 'canvas', 'brush'], subcategories: ['Paint', 'Canvas', 'Tools'] },
  { id: 'pets', label: 'Pet shop', emoji: '🐾', color: '#8bc34a', keywords: ['dog', 'cat', 'leash'], subcategories: ['Food', 'Accessories'] },
  ...DEFAULT_CATEGORIES,
]

type Sample = Pick<Entry, 'type' | 'product' | 'category' | 'subcategory' | 'quantity' | 'unit' | 'unitPrice' | 'total' | 'source' | 'lowStockThreshold'> & { daysAgo: number }

const stock = (category: string, subcategory: string, product: string, quantity: number, unit: string, unitPrice: number, lowStockThreshold: number, source: Entry['source'], daysAgo: number): Sample => ({
  type: 'inventory', product, category, subcategory, quantity, unit, unitPrice, total: Math.round(quantity * unitPrice * 100) / 100, source, lowStockThreshold, daysAgo,
})
const spend = (category: string, product: string, total: number, source: Entry['source'], daysAgo: number): Sample => ({
  type: 'expense', product, category, subcategory: null, quantity: null, unit: null, unitPrice: null, total, source, lowStockThreshold: null, daysAgo,
})

const SAMPLES: Sample[] = [
  stock('cafe', 'Beans', 'Arabica coffee beans', 12, 'kg', 9.5, 5, 'text', 18),
  stock('cafe', 'Dairy', 'Oat milk', 6, 'liter', 2.2, 4, 'voice', 12),
  stock('cafe', 'Supplies', 'Paper cups', 3, 'box', 14, 5, 'photo', 6),
  spend('cafe', 'Espresso machine service', 85, 'photo', 9),
  stock('bikes', 'Parts', 'Inner tubes 26 in', 18, 'piece', 4.5, 6, 'text', 20),
  stock('bikes', 'Parts', 'Brake pads', 9, 'pair', 11, 4, 'voice', 15),
  stock('bikes', 'Lubricants', 'Chain lube', 2, 'bottle', 7, 4, 'text', 5),
  spend('bikes', 'Workshop rent', 400, 'text', 14),
  stock('art', 'Paint', 'Acrylic paint set', 7, 'set', 24, 3, 'photo', 17),
  stock('art', 'Canvas', 'Canvas 30x40', 14, 'piece', 6.5, 5, 'text', 11),
  stock('art', 'Tools', 'Brushes', 20, 'piece', 3.2, 8, 'voice', 8),
  spend('art', 'Online class fee', 60, 'text', 3),
  stock('pets', 'Food', 'Dry dog food', 10, 'bag', 28, 4, 'photo', 19),
  stock('pets', 'Food', 'Cat litter', 8, 'bag', 12, 3, 'text', 13),
  stock('pets', 'Accessories', 'Leashes', 4, 'piece', 9, 6, 'voice', 7),
  spend('pets', 'Delivery van fuel', 70, 'photo', 2),
]

/** Returns true when sample data was written. */
export function seedDemoDataIfFirstVisit(): boolean {
  try {
    if (localStorage.getItem(SEEDED_KEY) || localStorage.getItem(ENTRIES_KEY) || localStorage.getItem(CATEGORIES_KEY)) return false
    const now = Date.now()
    const entries: Entry[] = SAMPLES.map(({ daysAgo, ...sample }, index) => ({
      ...sample,
      id: `${DEMO_ID_PREFIX}${index + 1}`,
      currency: 'USD',
      note: 'Sample data',
      createdAt: new Date(now - daysAgo * 86_400_000).toISOString(),
    }))
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(SAMPLE_CATEGORIES))
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
    localStorage.setItem(SEEDED_KEY, '1')
    return true
  } catch {
    return false // storage blocked: the app simply starts empty
  }
}

/** True while the browser still holds only the sample entries. */
export function isShowingSampleData(): boolean {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    const entries = raw ? (JSON.parse(raw) as Array<{ id?: string }>) : []
    return entries.length > 0 && entries.every((entry) => entry.id?.startsWith(DEMO_ID_PREFIX))
  } catch {
    return false
  }
}

export function clearSampleData(): void {
  try {
    localStorage.removeItem(ENTRIES_KEY)
    localStorage.removeItem(CATEGORIES_KEY)
    localStorage.setItem(SEEDED_KEY, '1') // never seed again in this browser
  } catch {
    // nothing to clear
  }
  window.location.reload()
}
