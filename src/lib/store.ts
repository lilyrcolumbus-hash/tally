import type { Entry } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { pushToSheet } from '@/lib/sheets'

const LS_KEY = 'tally_entries'

export type StorageMode = 'cloud' | 'local'

interface EntryRow {
  id: string
  user_id?: string
  type: Entry['type']
  product: string | null
  category: string
  quantity: number | null
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
    quantity: entry.quantity,
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
    quantity: row.quantity,
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
  const session = await cloud()
  if (session) {
    const { error } = await session.client.from('entries').insert(toRow(entry, session.userId))
    if (error) throw new Error(error.message)
  } else {
    writeLocal([entry, ...readLocal()])
  }
  void pushToSheet('upsert', entry)
}

export async function updateEntry(updated: Entry): Promise<void> {
  const session = await cloud()
  if (session) {
    const { error } = await session.client.from('entries').update(toRow(updated)).eq('id', updated.id)
    if (error) throw new Error(error.message)
  } else {
    writeLocal(readLocal().map((e) => (e.id === updated.id ? updated : e)))
  }
  void pushToSheet('upsert', updated)
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
