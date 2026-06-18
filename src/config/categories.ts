// Top-level categories ("projects"). Each has suggested subcategories (product lines).
// Used to drive the AI prompt, the confirm chips, and the offline fallback classifier.

export interface CategoryDef {
  id: string
  label: string
  emoji: string
  /** Keywords (EN/ES) the AI + offline fallback use to guess the category. */
  keywords: string[]
  /** Suggested subcategories / product lines (the user can also type a custom one). */
  subcategories: string[]
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'mushrooms',
    label: 'Mushrooms',
    emoji: '🍄',
    keywords: ['mushroom', 'mushrooms', 'hongo', 'hongos', 'seta', 'setas', 'oyster', 'shiitake', 'reishi', 'lions mane', 'champiñon'],
    subcategories: ['Oyster', 'Pink Oyster', 'Shiitake', "Lion's Mane", 'Reishi'],
  },
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    keywords: ['home', 'casa', 'garden', 'jardin', 'jardín', 'cleaning', 'aseo', 'limpieza', 'utilities', 'servicios', 'food', 'comida', 'grocery', 'personal care', 'rent', 'renta'],
    subcategories: ['Garden', 'Personal Care', 'Utilities', 'Food', 'Misc'],
  },
  {
    id: 'digital',
    label: 'Digital Projects',
    emoji: '💻',
    keywords: ['project', 'proyecto', 'app', 'software', 'domain', 'dominio', 'hosting', 'subscription', 'tally', 'ada', 'smartgrowth', 'dev', 'development'],
    subcategories: ['Tally', 'Ada', 'SmartGrowth'],
  },
  {
    id: 'lyhoff',
    label: 'LYHOFF',
    emoji: '👜',
    keywords: ['lyhoff', 'brand', 'marca'],
    subcategories: [],
  },
  {
    id: 'other',
    label: 'Other',
    emoji: '🔵',
    keywords: [],
    subcategories: [],
  },
]

export const DEFAULT_CATEGORY_ID = 'other'

export function categoryById(id: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export function subcategoriesFor(categoryId: string): string[] {
  return CATEGORIES.find((c) => c.id === categoryId)?.subcategories ?? []
}
