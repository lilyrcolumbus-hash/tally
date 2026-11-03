import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  url && anonKey && url.startsWith('http') && !url.includes('YOUR_'),
)

let cached: SupabaseClient | null = null

/**
 * Lazily create the Supabase client. Returns null when env vars are missing
 * so the app still runs in local-only (demo) mode. NEVER import createClient
 * at module top-level — an empty URL throws and blanks the page.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured || !url || !anonKey) return null
  if (cached) return cached
  const { createClient } = await import('@supabase/supabase-js')
  cached = createClient(url, anonKey)
  return cached
}
