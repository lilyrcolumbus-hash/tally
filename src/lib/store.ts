import type { Entry } from '@/types'
import { normalizeCategoryId } from '@/lib/categoryStore'
import { getSupabase } from '@/lib/supabase'
import { pushToSheet, pushToSheetChecked } from '@/lib/sheets'
import { normalizeUnit } from '@/lib/utils'

const LS_KEY = 'tally_entries'

export type StorageMode = 'cloud' | 'local'

interface EntryRow {
  id: string
  user_id?: string
  type: Entry['type']
  product: string | null
  category: string
  subcategory: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total: number | null
  currency: string
  note: string | null
  source: Entry['source']
  low_stock_threshold: number | null
  created_at: string
}

function toRow(entry: Entry, userId?: string): EntryRow {
  return {
    id: entry.id,
    ...(userId ? { user_id: userId } : {}),
    type: entry.type,
    product: entry.product,
    category: entry.category,
    subcategory: entry.subcategory,
    quantity: entry.quantity,
    unit: entry.unit,
    unit_price: entry.unitPrice,
    total: entry.total,
    currency: entry.currency,
    note: entry.note,
    source: entry.source,
    low_stock_threshold: entry.lowStockThreshold,
    created_at: entry.createdAt,
  }
}

function fromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type,
    product: row.product,
    category: row.category,
    subcategory: row.subcategory,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    total: row.total,
    currency: row.currency,
    note: row.note,
    source: row.source,
    lowStockThreshold: row.low_stock_threshold,
    createdAt: row.created_at,
  }
}

/** Returns a logged-in Supabase client, or null to use local storage. */
async function cloud(): Promise<{ client: NonNullable<Awaited<ReturnType<typeof getSupabase>>>; userId: string } | null> {
  const client = await getSupabase()
  if (!client) return null
  const { data } = await client.auth.getUser()
  if (!data.user) return null
  return { client, userId: data.user.id }
}

export async function storageMode(): Promise<StorageMode> {
  return (await cloud()) ? 'cloud' : 'local'
}

// ---- local storage helpers ----

function readLocal(): Entry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Entry[]) : []
  } catch {
    return []
  }
}

function writeLocal(entries: Entry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(entries))
}

// ---- public API ----

export async function listEntries(): Promise<Entry[]> {
  const session = await cloud()
  if (session) {
    const { data, error } = await session.client
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as EntryRow[]).map(fromRow)
  }
  return readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addEntry(entry: Entry): Promise<void> {
  const normalized = { ...entry, category: normalizeCategoryId(entry.category), unit: normalizeUnit(entry.unit) }
  const session = await cloud()
  if (session) {
    const { error } = await session.client.from('entries').insert(toRow(normalized, session.userId))
    if (error) throw new Error(error.message)
  } else {
    writeLocal([normalized, ...readLocal()])
  }
  void pushToSheet('upsert', normalized)
}

export async function updateEntry(updated: Entry): Promise<void> {
  const normalized = { ...updated, category: normalizeCategoryId(updated.category), unit: normalizeUnit(updated.unit) }
  const session = await cloud()
  if (session) {
    const { error } = await session.client.from('entries').update(toRow(normalized)).eq('id', normalized.id)
    if (error) throw new Error(error.message)
  } else {
    writeLocal(readLocal().map((e) => (e.id === normalized.id ? normalized : e)))
  }
  void pushToSheet('upsert', normalized)
}

export async function removeEntry(entry: Entry): Promise<void> {
  const session = await cloud()
  if (session) {
    const { error } = await session.client.from('entries').delete().eq('id', entry.id)
    if (error) throw new Error(error.message)
  } else {
    writeLocal(readLocal().filter((e) => e.id !== entry.id))
  }
  void pushToSheet('delete', entry)
}

// One-time catch-up: the Sheets webhook was silently broken 2026-06-20 to
// 2026-07-04 (stale Apps Script deployment + missing auth token), so entries
// saved during that window never reached the mirror. Resend everything once
// per device — upsert-by-id makes this safe to replay against rows that
// already synced. Only marks itself done once Google actually confirms every
// row, so a device that ran this before the token was fixed will retry.
const BACKFILL_KEY = 'tally_sheets_backfill_2026_07_04_v2'

export async function backfillSheetsSync(entries: Entry[]): Promise<void> {
  if (localStorage.getItem(BACKFILL_KEY)) return
  let allOk = true
  for (const entry of entries) {
    const ok = await pushToSheetChecked('upsert', entry)
    if (!ok) allOk = false
  }
  if (allOk) localStorage.setItem(BACKFILL_KEY, new Date().toISOString())
}
