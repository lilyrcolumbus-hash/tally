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
- "type": "inventory" (a physical thing they HAVE, with a quantity) or "expense" (money that went out). If unsure, use "${input.defaultType}".
- "product": the item name in the user's language, or null if they only stated an amount with no product.
- "category": one of these ids: ${categoryList}. Pick the best fit, else "${DEFAULT_CATEGORY_ID}".
- "quantity": number of units, or null.
- "unit": the unit of measure they said (lb, pound, libra, kg, kilo, gram, liter, litro, ml, box, caja, bag, bottle, piece, dozen…), in the user's words, or null.
- "unitPrice": price per unit, or null.
- "total": total money for this record. If quantity and unitPrice are given, total = quantity * unitPrice. If they only said a total amount, put it here. Else null.
- "note": any extra detail, or null.

Currency is ${input.currency}; return plain numbers (no symbols).
If they only say how much they spent without a product (e.g. "I spent 40"), return one expense with product null and total 40.

Example input: "Compré 3 paquetes de café a 5 dólares cada uno"
Example output: [{"type":"inventory","product":"café","category":"food","quantity":3,"unit":"paquetes","unitPrice":5,"total":15,"note":null}]
Example input: "una libra de azúcar"
Example output: [{"type":"inventory","product":"azúcar","category":"food","quantity":1,"unit":"libra","unitPrice":null,"total":null,"note":null}]

${input.text ? `User text: "${input.text}"` : 'Extract from the attached audio/photo.'}`
}

interface RawDraft {
  type?: string
  product?: string | null
  category?: string
  quantity?: number | null
  unit?: string | null
  unitPrice?: number | null
  total?: number | null
  note?: string | null
}

function normalizeDraft(raw: RawDraft, fallbackType: EntryType): EntryDraft {
  const type: EntryType = raw.type === 'inventory' || raw.type === 'expense' ? raw.type : fallbackType
  const category = CATEGORIES.some((c) => c.id === raw.category) ? (raw.category as string) : DEFAULT_CATEGORY_ID
  const quantity = typeof raw.quantity === 'number' ? raw.quantity : null
  const unitPrice = typeof raw.unitPrice === 'number' ? raw.unitPrice : null
  let total = typeof raw.total === 'number' ? raw.total : null
  if (total === null && quantity !== null && unitPrice !== null) total = quantity * unitPrice
  const product = typeof raw.product === 'string' && raw.product.trim() ? raw.product.trim() : null
  const unit = typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : null
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null
  return { type, product, category, quantity, unit, unitPrice, total, note }
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
