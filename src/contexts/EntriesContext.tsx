import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Entry } from '@/types'
import { listEntries, addEntry, updateEntry, removeEntry, storageMode, type StorageMode } from '@/lib/store'
import { useAuth } from '@/contexts/AuthContext'

interface EntriesState {
  entries: Entry[]
  loading: boolean
  error: string | null
  mode: StorageMode
  reload: () => Promise<void>
  add: (entry: Entry) => Promise<void>
  update: (entry: Entry) => Promise<void>
  remove: (entry: Entry) => Promise<void>
}

const EntriesContext = createContext<EntriesState | null>(null)

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<StorageMode>('local')

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      setMode(await storageMode())
      setEntries(await listEntries())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload when auth finishes or the signed-in user changes (cloud <-> local).
  useEffect(() => {
    if (authLoading) return
    void reload()
  }, [authLoading, user?.id, reload])

  const add = async (entry: Entry): Promise<void> => {
    await addEntry(entry)
    setEntries((prev) => [entry, ...prev])
  }

  const update = async (entry: Entry): Promise<void> => {
    await updateEntry(entry)
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
  }

  const remove = async (entry: Entry): Promise<void> => {
    await removeEntry(entry)
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
  }

  return (
    <EntriesContext.Provider value={{ entries, loading, error, mode, reload, add, update, remove }}>
      {children}
    </EntriesContext.Provider>
  )
}

export function useEntries(): EntriesState {
  const ctx = useContext(EntriesContext)
  if (!ctx) throw new Error('useEntries must be used within EntriesProvider')
  return ctx
}
