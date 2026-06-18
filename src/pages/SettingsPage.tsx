import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEntries } from '@/contexts/EntriesContext'
import { normalizeCategoryId } from '@/config/categories'
import { loadSettings, saveSettings } from '@/lib/settings'
import { isGeminiConfigured } from '@/lib/gemini'
import { isSheetsConfigured } from '@/lib/sheets'
import { HardDrive, Sparkles, Sheet as SheetIcon, Check, X, Trash2 } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'GBP', 'BRL']

function StatusRow({ ok, label, on, off }: { ok: boolean; label: React.ReactNode; on: string; off: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="flex items-center gap-2 text-ink-400">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-semibold ${ok ? 'text-success' : 'text-ink-500'}`}>
        {ok ? <Check size={13} /> : <X size={13} />}
        {ok ? on : off}
      </span>
    </div>
  )
}

export function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings())
  const { entries, remove } = useEntries()
  const [clearing, setClearing] = useState(false)

  const otherEntries = entries.filter((e) => normalizeCategoryId(e.category) === 'other')

  const updateSettings = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const handleClearOther = async () => {
    if (otherEntries.length === 0) {
      toast('Nothing to clear')
      return
    }
    setClearing(true)
    try {
      for (const e of otherEntries) await remove(e)
      toast.success(`Cleared ${otherEntries.length} test ${otherEntries.length === 1 ? 'entry' : 'entries'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not clear')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Preferences */}
      <Card className="px-4 py-4">
        <h2 className="mb-3 text-sm font-bold text-ink-300">Preferences</h2>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Currency</span>
          <select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Low-stock alert when units ≤</span>
          <input
            inputMode="numeric"
            value={settings.lowStockDefault}
            onChange={(e) => updateSettings({ lowStockDefault: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
          />
        </label>
      </Card>

      {/* Connection status */}
      <Card className="px-4 py-4">
        <h2 className="mb-2 text-sm font-bold text-ink-300">Connections</h2>
        <StatusRow
          ok={isGeminiConfigured}
          label={<><Sparkles size={15} /> AI (voice &amp; photo)</>}
          on="On"
          off="Demo mode"
        />
        <StatusRow
          ok={isSheetsConfigured}
          label={<><SheetIcon size={15} /> Google Sheets</>}
          on="On"
          off="Off"
        />
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ink-800/60 px-2.5 py-2 text-[11px] text-ink-500">
          <HardDrive size={13} className="mt-0.5 shrink-0" />
          {isSheetsConfigured
            ? 'Everything you add is saved on this device and copied to your Google Sheet automatically.'
            : 'Everything you add is saved on this device.'}
        </p>
      </Card>

      {/* Maintenance */}
      <Card className="px-4 py-4">
        <h2 className="mb-1 text-sm font-bold text-ink-300">Maintenance</h2>
        <p className="mb-3 text-xs text-ink-500">Remove old test entries that landed in “Other”.</p>
        <Button variant="danger" onClick={handleClearOther} disabled={clearing || otherEntries.length === 0}>
          <Trash2 size={15} />
          {clearing ? 'Clearing…' : `Clear “Other” (${otherEntries.length})`}
        </Button>
      </Card>

      <p className="px-2 text-center text-[11px] text-ink-700">卌 Tally — build {__BUILD_ID__} UTC</p>
    </div>
  )
}
