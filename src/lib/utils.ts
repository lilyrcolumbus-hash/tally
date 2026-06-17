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
