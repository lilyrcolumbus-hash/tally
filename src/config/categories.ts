// Default top-level categories ("projects"), seeded into local storage on
// first run. From then on the live, user-editable list lives in
// @/lib/categoryStore — this file only defines the shape and the starting
// set. Users can add, rename and remove their own categories in Settings.

export interface CategoryDef {
  id: string
  label: string
  emoji: string
  /** Accent color (hex) for glows / pills. */
  color: string
  /** Keywords (EN/ES) the AI + offline fallback use to guess the category. */
  keywords: string[]
  /** Suggested subcategories / product lines (the user can also type a custom one). */
  subcategories: string[]
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'other',
    label: 'Other',
    emoji: '🔵',
    color: '#9aa0a6',
    keywords: [],
    subcategories: [],
  },
]

export const DEFAULT_CATEGORY_ID = 'other'
