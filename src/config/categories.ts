// Default categories. Used to drive the AI prompt and the offline fallback classifier.

export interface CategoryDef {
  id: string
  label: string
  emoji: string
  /** Keywords (EN/ES) the offline fallback uses to guess the category. */
  keywords: string[]
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food & Groceries', emoji: '🍎', keywords: ['food', 'comida', 'grocery', 'supermercado', 'cafe', 'coffee', 'cafe', 'leche', 'pan', 'bread', 'fruit', 'fruta', 'snack'] },
  { id: 'supplies', label: 'Supplies', emoji: '📦', keywords: ['supply', 'supplies', 'suministro', 'material', 'paper', 'papel', 'box', 'caja', 'bag', 'bolsa'] },
  { id: 'home', label: 'Home', emoji: '🏠', keywords: ['home', 'casa', 'cleaning', 'limpieza', 'soap', 'jabon', 'detergent', 'detergente', 'toilet', 'kitchen', 'cocina'] },
  { id: 'health', label: 'Health & Beauty', emoji: '💊', keywords: ['health', 'salud', 'medicine', 'medicina', 'pharmacy', 'farmacia', 'beauty', 'shampoo', 'cream', 'crema', 'vitamin'] },
  { id: 'products', label: 'Products for sale', emoji: '🏷️', keywords: ['product', 'producto', 'inventory', 'inventario', 'stock', 'sale', 'venta', 'merch'] },
  { id: 'mushrooms', label: 'Mushrooms', emoji: '🍄', keywords: ['mushroom', 'mushrooms', 'hongo', 'hongos', 'seta', 'setas', 'champiñon', 'champiñones', 'oyster', 'reishi', 'lions mane', 'shiitake'] },
  { id: 'tools', label: 'Tools & Equipment', emoji: '🔧', keywords: ['tool', 'herramienta', 'equipment', 'equipo', 'machine', 'maquina', 'drill', 'hammer'] },
  { id: 'transport', label: 'Transport', emoji: '🚗', keywords: ['transport', 'gas', 'gasolina', 'fuel', 'combustible', 'uber', 'taxi', 'bus', 'parking', 'estacionamiento'] },
  { id: 'services', label: 'Services & Bills', emoji: '🧾', keywords: ['service', 'servicio', 'bill', 'factura', 'rent', 'renta', 'internet', 'phone', 'telefono', 'electricity', 'luz', 'water', 'agua', 'subscription'] },
  { id: 'other', label: 'Other', emoji: '🔵', keywords: [] },
]

export const DEFAULT_CATEGORY_ID = 'other'

export function categoryById(id: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
