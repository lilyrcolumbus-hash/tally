import type { EntryDraft, EntryType, ExtractionResult } from '@/types'
import { CATEGORIES, DEFAULT_CATEGORY_ID } from '@/config/categories'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const hasClientKey = Boolean(apiKey && !apiKey.includes('YOUR_'))
// In production we call a server-side proxy (/api/extract) so the key is never
// shipped in the browser bundle. In dev, a VITE_GEMINI_API_KEY calls Gemini directly.
const useProxy = !hasClientKey && import.meta.env.PROD
export const isGeminiConfigured = hasClientKey || useProxy

const MODEL = 'gemini-2.5-flash'

export interface ExtractionInput {
  text?: string
  audio?: { base64: string; mimeType: string }
  image?: { base64: string; mimeType: string }
  /** The mode the user is in — used as a hint, not a hard rule. */
  defaultType: EntryType
  currency: string
}

function buildPrompt(input: ExtractionInput): string {
  const categoryList = CATEGORIES.map((c) => `${c.id} (${c.label})`).join(', ')
  return `You extract inventory and spending records for a small-business owner. They speak Spanish or English and may use voice, a receipt photo, or free text.

Return ONLY JSON: an array of records. One record per distinct item. A receipt photo can yield many records.

Each record:
- "type":
  • "income" — money they RECEIVED (a sale, payment, or earning).
  • "expense" — money spent on services, utilities, or consumables they will NOT resell (electricity, packaging, tools, restaurant supplies).
  • "inventory" — physical goods they HAVE, GREW, or BOUGHT to sell or track as stock. KEY RULE: if they bought something that IS their product or a raw material for their product (e.g., mushrooms, produce, resale items), use "inventory" even if the sentence uses "bought" or "paid".
  The user pre-selected "${input.defaultType}" as the default type — use it when no other type is clearly evident from the text.
- "product": the item name IN ENGLISH — translate it if the user spoke Spanish (café→Coffee, azúcar→Sugar). Null if they only stated an amount with no product.
- "category": one of these ids: ${categoryList}. If you genuinely cannot tell which one it is, return "" (empty string) so the app can ask the user.
- "subcategory": the product line / project within the category, IN ENGLISH (e.g. Shiitake or Oyster for Mushrooms; Garden or Utilities for Home; Tally or Ada for Digital Projects), or null.
- "quantity": number of units, or null.
- "unit": the unit of measure, normalized to a standard English abbreviation (lb, kg, g, oz, l, ml, box, bag, bottle, pc, doz…). Always translate and normalize: "libras"→"lb", "kilos"→"kg", "gramos"→"g", "cajas"→"box", "litros"→"l". Null if not stated.
- "unitPrice": price per unit, or null.
- "total": total money for this record. If quantity and unitPrice are given, total = quantity * unitPrice. If they only said a total amount, put it here. Else null.
- "note": ONLY a genuinely extra remark (in English), or null. NEVER put the unit, quantity or price here. The unit of measure (pounds, lb, kg, liter, box…) ALWAYS goes in "unit", never in "note".

Currency is ${input.currency}; return plain numbers (no symbols). All text fields (product, subcategory, note) must be in ENGLISH.
If they only say how much they spent/earned without detail (e.g. "I sold 50"), return product null, the right type, total 50, and category "" so the app asks.

Example input: "vendí 3 libras de hongos shiitake a 5 cada una"
Example output: [{"type":"income","product":"Shiitake mushrooms","category":"mushrooms","subcategory":"Shiitake","quantity":3,"unit":"lb","unitPrice":5,"total":15,"note":null}]
Example input: "una libra de azúcar para la casa"
Example output: [{"type":"inventory","product":"Sugar","category":"home","subcategory":"Food","quantity":1,"unit":"lb","unitPrice":null,"total":null,"note":null}]
Example input: "bought 20 lb oyster mushrooms for $80"
Example output: [{"type":"inventory","product":"Oyster Mushrooms","category":"mushrooms","subcategory":"Oyster","quantity":20,"unit":"lb","unitPrice":4,"total":80,"note":null}]
Example input: "vendí 50"
Example output: [{"type":"income","product":null,"category":"","subcategory":null,"quantity":null,"unit":null,"unitPrice":null,"total":50,"note":null}]

${input.text ? `User text: "${input.text}"` : 'Extract from the attached audio/photo.'}`
}

interface RawDraft {
  type?: string
  product?: string | null
  category?: string
  subcategory?: string | null
  quantity?: number | null
  unit?: string | null
  unitPrice?: number | null
  total?: number | null
  note?: string | null
}

const UNIT_MAP: Record<string, string> = {
  lbs: 'lb', pound: 'lb', pounds: 'lb', libra: 'lb', libras: 'lb',
  kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  gram: 'g', grams: 'g', gramo: 'g', gramos: 'g',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l', litro: 'l', litros: 'l',
  milliliter: 'ml', milliliters: 'ml', mililitro: 'ml', mililitros: 'ml',
  ounce: 'oz', ounces: 'oz', onza: 'oz', onzas: 'oz',
  boxes: 'box', caja: 'box', cajas: 'box',
  bags: 'bag', bolsa: 'bag', bolsas: 'bag',
  bottles: 'bottle', botella: 'bottle', botellas: 'bottle',
  piece: 'pc', pieces: 'pc', pieza: 'pc', piezas: 'pc',
  dozen: 'doz', docena: 'doz', docenas: 'doz',
}

function normalizeUnit(raw: string | null): string | null {
  if (!raw) return null
  const lower = raw.trim().toLowerCase()
  return UNIT_MAP[lower] ?? raw.trim()
}

function normalizeDraft(raw: RawDraft, fallbackType: EntryType): EntryDraft {
  const validTypes: EntryType[] = ['inventory', 'expense', 'income']
  const type: EntryType = validTypes.includes(raw.type as EntryType) ? (raw.type as EntryType) : fallbackType
  // Empty string when the AI is unsure — the confirm screen then asks the user.
  const category = CATEGORIES.some((c) => c.id === raw.category) ? (raw.category as string) : ''
  const quantity = typeof raw.quantity === 'number' ? raw.quantity : null
  const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : null
  let total = typeof raw.total === 'number' ? raw.total : null
  if (total === null && quantity !== null && unitPrice !== null) total = quantity * unitPrice
  const product = typeof raw.product === 'string' && raw.product.trim() ? raw.product.trim() : null
  const subcategory = typeof raw.subcategory === 'string' && raw.subcategory.trim() ? raw.subcategory.trim() : null
  const unit = normalizeUnit(typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit : null)
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null
  return { type, product, category, subcategory, quantity, unit, unitPrice, total, note }
}

type GeminiPart = { text: string } | { inlineData: { data: string; mimeType: string } }

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

const GENERATION_CONFIG = { responseMimeType: 'application/json', temperature: 0.2 }

/** Calls Gemini directly (dev, with client key) or via the secure proxy (prod). */
async function geminiGenerate(parts: GeminiPart[]): Promise<string> {
  if (hasClientKey && apiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: GENERATION_CONFIG }),
      },
    )
    if (!res.ok) throw new Error(`AI error ${res.status}`)
    return readText((await res.json()) as GeminiResponse)
  }

  // Production: the key lives only on the server (Cloudflare Pages Function).
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts, generationConfig: GENERATION_CONFIG }),
  })
  const data = (await res.json()) as { text?: string; error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? `AI error ${res.status}`)
  if (typeof data.text !== 'string') throw new Error('Empty AI response')
  return data.text
}

function readText(data: GeminiResponse): string {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') throw new Error('Empty AI response')
  return text
}

export async function extractEntries(input: ExtractionInput): Promise<ExtractionResult> {
  if (!isGeminiConfigured) {
    // Offline mode can only read TYPED text. Voice/photo carry no text to parse —
    // returning a blank draft there would be inventing a record we never read.
    if (!input.text || !input.text.trim()) {
      return { drafts: [], usedFallback: true }
    }
    return { drafts: [fallbackParse(input)], usedFallback: true }
  }

  const parts: GeminiPart[] = [{ text: buildPrompt(input) }]
  if (input.audio) parts.push({ inlineData: { data: input.audio.base64, mimeType: input.audio.mimeType } })
  if (input.image) parts.push({ inlineData: { data: input.image.base64, mimeType: input.image.mimeType } })

  const text = await geminiGenerate(parts)
  const parsed: unknown = JSON.parse(text)
  const rawDrafts: RawDraft[] = Array.isArray(parsed) ? parsed : [parsed as RawDraft]
  const drafts = rawDrafts
    .map((raw) => normalizeDraft(raw, input.defaultType))
    .filter((d) => d.product || d.total !== null)

  if (drafts.length === 0 && input.text && input.text.trim()) drafts.push(fallbackParse(input))
  return { drafts, usedFallback: false }
}

/**
 * Offline heuristic when no AI key is set. Parses real numbers out of the text —
 * it never invents data; missing fields stay null for the user to fill in the
 * confirmation screen.
 */
export function fallbackParse(input: ExtractionInput): EntryDraft {
  const text = (input.text ?? '').trim()
  const lower = text.toLowerCase().normalize('NFC')

  const toNum = (s: string): number => parseFloat(s.replace(',', '.'))
  const allNumbers = (lower.match(/\d+(?:[.,]\d+)?/g) ?? []).map(toNum)

  // Quantity: "5 boxes", "3 x", "2 unidades", "4 bags"
  const qtyMatch = lower.match(
    /(\d+(?:[.,]\d+)?)\s*(x\b|paquetes?|unidades?|units?|pcs?|pieces?|cajas?|boxes?|botellas?|bottles?|bolsas?|bags?)/,
  )
  const quantity = qtyMatch ? toNum(qtyMatch[1]) : null

  // An explicitly-marked price: "at 3", "a 3", "@3", "3 each", "3 cada", or next to a currency word.
  const markerMatch =
    lower.match(/(?:\bat\b|@|\ba\b(?=\s*\d))\s*(\d+(?:[.,]\d+)?)/) ||
    lower.match(/(\d+(?:[.,]\d+)?)\s*(?:each|cada|c\/u|por\s+unidad)/)
  const currencyMatch = lower.match(
    /(?:\$|usd|d[oó]lares?|dollars?|euros?|pesos?)\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:\$|usd|d[oó]lares?|dollars?|euros?|pesos?)/,
  )

  let markedPrice: number | null = null
  if (markerMatch) markedPrice = toNum(markerMatch[1])
  else if (currencyMatch) markedPrice = toNum(currencyMatch[1] ?? currencyMatch[2])

  let unitPrice: number | null = null
  let total: number | null = null

  if (quantity !== null && markedPrice !== null) {
    // "5 boxes at 3" → the marked number is the unit price.
    unitPrice = markedPrice
    total = Math.round(quantity * markedPrice * 100) / 100
  } else if (markedPrice !== null) {
    total = markedPrice
  } else {
    // No marked price. Only guess when there is exactly one number that isn't the
    // quantity — otherwise leave it null. Never invent an amount.
    const nonQty = allNumbers.filter((n) => n !== quantity)
    if (nonQty.length === 1) total = nonQty[0]
  }

  const isExpense = /(gast[eé]|pagu[eé]|spent|paid|bill|factura|recibo)/.test(lower)
  const type: EntryType = isExpense ? 'expense' : input.defaultType

  // Product = remaining words after stripping numbers, units, prepositions and filler.
  const product =
    lower
      .replace(/\d+(?:[.,]\d+)?/g, ' ')
      .replace(
        /\b(compr[eé]|gast[eé]|pagu[eé]|bought|spent|paid|at|on|of|in|for|to|a|de|del|en|the|el|la|los|las|un|una|por|cada|each|c\/u|x|paquetes?|unidades?|units?|pcs?|pieces?|cajas?|boxes?|botellas?|bottles?|bolsas?|bags?|d[oó]lares?|dollars?|usd|euros?|pesos?)(?=\s|$)/g,
        ' ',
      )
      .replace(/[@$]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null

  const unitMatch = lower.match(
    /\b(lbs?|pounds?|libras?|kg|kilos?|kilogramos?|gr?|gramos?|grams?|oz|onzas?|ounces?|lt?|litros?|liters?|ml|cajas?|boxes?|paquetes?|packs?|bolsas?|bags?|botellas?|bottles?|piezas?|pieces?|docenas?|dozens?|unidades?|units?)\b/,
  )

  return {
    type,
    product: product ? product.charAt(0).toUpperCase() + product.slice(1) : null,
    category: guessCategory(lower),
    subcategory: null,
    quantity,
    unit: unitMatch ? unitMatch[1] : null,
    unitPrice,
    total,
    note: null,
  }
}

function guessCategory(lower: string): string {
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => lower.includes(k))) return cat.id
  }
  return DEFAULT_CATEGORY_ID
}
