import { CapturePanel } from '@/components/capture/CapturePanel'
import { EntryList } from '@/components/EntryList'
import { useEntries } from '@/contexts/EntriesContext'
import { Loader2 } from 'lucide-react'

export function HomePage() {
  const { entries, loading, error } = useEntries()
  const recent = entries.slice(0, 8)

  return (
    <div className="space-y-5">
      <CapturePanel />

      {error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent</h2>
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-600">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : (
          <EntryList entries={recent} emptyText="Add your first item above — speak, snap a receipt, or type." />
        )}
      </section>
    </div>
  )
}
