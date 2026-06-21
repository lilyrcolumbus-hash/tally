import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null, currency = 'USD'): string {
  if (amount === null || Number.isNaN(amount)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Unknown/invalid ISO code — show the raw code rather than mislabel as USD.
    return `${amount.toFixed(2)} ${currency}`
  }
}

/** The most common currency among entries — used so totals never mix currencies. */
export function dominantCurrency(entries: ReadonlyArray<{ currency: string }>, fallback = 'USD'): string {
  if (entries.length === 0) return fallback
  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.currency, (counts.get(e.currency) ?? 0) + 1)
  let best = fallback
  let bestN = -1
  for (const [cur, n] of counts) {
    if (n > bestN) {
      best = cur
      bestN = n
    }
  }
  return best
}

export function hasMixedCurrencies(entries: ReadonlyArray<{ currency: string }>): boolean {
  return new Set(entries.map((e) => e.currency)).size > 1
}

export interface FinanceSummary {
  income: number
  expense: number
  net: number
}

/** Income, expenses and net profit for one month, in a single currency. */
export function monthlyFinance(
  entries: ReadonlyArray<{ currency: string; createdAt: string; type: string; total: number | null }>,
  currency: string,
  month: string,
): FinanceSummary {
  let income = 0
  let expense = 0
  for (const e of entries) {
    if (e.currency !== currency || monthKey(e.createdAt) !== month) continue
    if (e.type === 'income') income += e.total ?? 0
    else if (e.type === 'expense') expense += e.total ?? 0
  }
  return { income, expense, net: income - expense }
}

export type Period = 'week' | 'month'

/** Monday-based start of the current week (local time). */
function startOfWeek(): Date {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - monday)
  return d
}

export function inPeriod(iso: string, period: Period): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  if (period === 'month') return monthKey(iso) === currentMonthKey()
  return date >= startOfWeek()
}

export function financeForPeriod(
  entries: ReadonlyArray<{ currency: string; createdAt: string; type: string; total: number | null }>,
  currency: string,
  period: Period,
): FinanceSummary {
  let income = 0
  let expense = 0
  for (const e of entries) {
    if (e.currency !== currency || !inPeriod(e.createdAt, period)) continue
    if (e.type === 'income') income += e.total ?? 0
    else if (e.type === 'expense') expense += e.total ?? 0
  }
  return { income, expense, net: income - expense }
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Convert a Blob/File to a base64 string (without the data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to read blob'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Resize an image File to at most maxPx on the longest side, then encode as
 * JPEG base64. This normalises HEIC/HEIF from iOS and keeps payload size
 * reasonable for the Gemini API without losing legibility for text extraction.
 */
export function imageFileToBase64(file: File, maxPx = 1536, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const comma = dataUrl.indexOf(',')
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}
