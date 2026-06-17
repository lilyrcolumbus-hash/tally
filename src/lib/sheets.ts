import type { Entry } from '@/types'

const webhook = import.meta.env.VITE_SHEETS_WEBHOOK_URL as string | undefined
export const isSheetsConfigured = Boolean(webhook && webhook.startsWith('http'))

export type SheetAction = 'upsert' | 'delete'

/**
 * Mirror a change to the Google Sheet via an Apps Script web app.
 * Fire-and-forget: a failed mirror must never block the app. We send
 * text/plain to avoid a CORS preflight (Apps Script doPost reads postData).
 */
export async function pushToSheet(action: SheetAction, entry: Entry): Promise<void> {
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, entry }),
      keepalive: true,
    })
  } catch (err) {
    console.warn('[sheets] mirror failed (non-blocking):', err)
  }
}
