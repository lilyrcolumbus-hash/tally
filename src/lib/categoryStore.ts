import { useSyncExternalStore } from 'react'
import type { CategoryDef } from '@/config/categories'
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ID } from '@/config/categories'

// User-editable categories, persisted locally. Anyone using the app can add,
// rename or remove their own categories in Settings — `DEFAULT_CATEGORIES` is
// just the seed for a brand-new install, nothing in it is fixed. A plain
// module-level store (not React Context) so non-component code (store.ts,
// gemini.ts, stock.ts) can read/normalize category ids too.

const LS_KEY = 'tally_categories'
const listeners = new Set<() => void>()

function loadInitial(): CategoryDef[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as CategoryDef[]
    }
  } catch {
    // malformed storage — fall through to defaults
  }
  return DEFAULT_CATEGORIES
}

let current: CategoryDef[] = loadInitial()

function persist(next: CategoryDef[]): void {
  current = next
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {
    // storage full/unavailable — keep the in-memory change for this session
  }
  listeners.forEach((fn) => fn())
}

export function getCategories(): CategoryDef[] {
  return current
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

/** Reactive list of all categories — re-renders the caller when they change. */
export function useCategories(): CategoryDef[] {
  return useSyncExternalStore(subscribe, getCategories)
}

export function categoryById(id: string): CategoryDef {
  return current.find((c) => c.id === id) ?? current[current.length - 1]
}

export function subcategoriesFor(categoryId: string): string[] {
  return current.find((c) => c.id === categoryId)?.subcategories ?? []
}

/** Collapse unknown, legacy or since-deleted category ids into 'other'. */
export function normalizeCategoryId(id: string): string {
  return current.some((c) => c.id === id) ? id : DEFAULT_CATEGORY_ID
}

/** All categories except the 'other' catch-all, for dashboards/grids. */
export function getMainCategories(categories: CategoryDef[] = current): CategoryDef[] {
  return categories.filter((c) => c.id !== DEFAULT_CATEGORY_ID)
}

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `category-${Date.now()}`
}

export function addCategory(input: { label: string; emoji: string; color: string }): CategoryDef {
  const label = input.label.trim()
  let id = slugify(label)
  let suffix = 2
  while (current.some((c) => c.id === id)) {
    id = `${slugify(label)}-${suffix++}`
  }
  const next: CategoryDef = {
    id,
    label,
    emoji: input.emoji.trim() || '🔵',
    color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : '#9aa0a6',
    keywords: [],
    subcategories: [],
  }
  // Keep 'other' last, matching the original fixed ordering.
  const otherIdx = current.findIndex((c) => c.id === DEFAULT_CATEGORY_ID)
  const list =
    otherIdx === -1 ? [...current, next] : [...current.slice(0, otherIdx), next, ...current.slice(otherIdx)]
  persist(list)
  return next
}

export function updateCategory(id: string, patch: Partial<Pick<CategoryDef, 'label' | 'emoji' | 'color'>>): void {
  persist(current.map((c) => (c.id === id ? { ...c, ...patch } : c)))
}

/** Removes a category. No-ops (returns false) for the 'other' catch-all, which always has to exist. */
export function removeCategory(id: string): boolean {
  if (id === DEFAULT_CATEGORY_ID) return false
  persist(current.filter((c) => c.id !== id))
  return true
}
