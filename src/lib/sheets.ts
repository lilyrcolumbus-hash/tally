import type { Entry } from '@/types'

const webhook = import.meta.env.VITE_SHEETS_WEBHOOK_URL as string | undefined
const token = import.meta.env.VITE_SHEETS_TOKEN as string | undefined
export const isSheetsConfigured = Boolean(webhook && webhook.startsWith('http'))

export type SheetAction = 'upsert' | 'delete'

/**
 * Sends one change to the Apps Script web app and reports whether it was
 * actually accepted. The HTTP request itself always "succeeds" (Apps Script
 * redirects to a 200 echo endpoint even on rejection), so success can only
 * be read from the JSON body's `ok` field, not the HTTP status.
 */
async function sendToSheet(action: SheetAction, entry: Entry): Promise<boolean> {
  if (!webhook) return true
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, entry, token }),
      keepalive: true,
    })
    const data: unknown = await res.json().catch(() => null)
    return Boolean(data && typeof data === 'object' && 'ok' in data && (data as { ok: unknown }).ok)
  } catch (err) {
    console.warn('[sheets] mirror failed:', err)
    return false
  }
}

/** Mirror a change to the Google Sheet. Fire-and-forget: a failed mirror must never block the app. */
export async function pushToSheet(action: SheetAction, entry: Entry): Promise<void> {
  await sendToSheet(action, entry)
}

/** Same as pushToSheet, but returns whether Google actually confirmed the write. */
export async function pushToSheetChecked(action: SheetAction, entry: Entry): Promise<boolean> {
  return sendToSheet(action, entry)
}
