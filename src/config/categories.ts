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
    id: 'mushrooms',
    label: 'Mushrooms',
    emoji: '🍄',
    color: '#34A853',
    keywords: ['mushroom', 'mushrooms', 'hongo', 'hongos', 'seta', 'setas', 'oyster', 'shiitake', 'reishi', 'lions mane', 'champiñon'],
    // Cultivation stage — applies to any strain. Species/strain names (Oyster,
    // Shiitake…) are NOT stages, they go in "product".
    subcategories: ['Liquid Culture', 'Grain Spawn', 'Agar', 'Fruiting', 'Fresh', 'Dried'],
  },
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    color: '#4285F4',
    keywords: ['home', 'casa', 'garden', 'jardin', 'jardín', 'cleaning', 'aseo', 'limpieza', 'utilities', 'servicios', 'food', 'comida', 'grocery', 'personal care', 'rent', 'renta'],
    subcategories: ['Garden', 'Personal Care', 'Utilities', 'Food', 'Misc'],
  },
  {
    id: 'digital',
    label: 'Digital Projects',
    emoji: '💻',
    color: '#00F2EA',
    keywords: ['project', 'proyecto', 'app', 'software', 'domain', 'dominio', 'hosting', 'subscription', 'tally', 'ada', 'smartgrowth', 'dev', 'development'],
    subcategories: ['Tally', 'Ada', 'SmartGrowth'],
  },
  {
    id: 'lyhoff',
    label: 'LYHOFF',
    emoji: '👜',
    color: '#F9AB00',
    keywords: ['lyhoff', 'brand', 'marca'],
    subcategories: [],
  },
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
