import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useEntries } from '@/contexts/EntriesContext'
import { loadSettings, saveSettings } from '@/lib/settings'
import { isGeminiConfigured } from '@/lib/gemini'
import { isSheetsConfigured } from '@/lib/sheets'
import { Cloud, HardDrive, Sparkles, Sheet as SheetIcon, Check, X } from 'lucide-react'

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
  const { user, configured, signIn, signUp, signOut } = useAuth()
  const { mode, reload } = useEntries()
  const [settings, setSettings] = useState(loadSettings())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const updateSettings = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const handleAuth = async (kind: 'in' | 'up') => {
    setAuthBusy(true)
    try {
      if (kind === 'in') await signIn(email, password)
      else await signUp(email, password)
      toast.success(kind === 'in' ? 'Signed in' : 'Account created')
      setEmail('')
      setPassword('')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setAuthBusy(false)
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
          ok={mode === 'cloud'}
          label={<><Cloud size={15} /> Cloud database</>}
          on="Synced"
          off="Local only"
        />
        <StatusRow
          ok={isGeminiConfigured}
          label={<><Sparkles size={15} /> AI (voice &amp; photo)</>}
          on="On"
          off="Demo mode"
        />
        <StatusRow
          ok={isSheetsConfigured}
          label={<><SheetIcon size={15} /> Google Sheets mirror</>}
          on="On"
          off="Off"
        />
        {mode === 'local' && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ink-800/60 px-2.5 py-2 text-[11px] text-ink-500">
            <HardDrive size={13} className="mt-0.5 shrink-0" />
            Your data is saved on this device. Connect the cloud below to sync and back it up.
          </p>
        )}
      </Card>

      {/* Account / cloud sync */}
      {configured && (
        <Card className="px-4 py-4">
          <h2 className="mb-3 text-sm font-bold text-ink-300">Cloud sync</h2>
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">{user.email}</span>
              <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => handleAuth('in')} disabled={authBusy}>
                  Sign in
                </Button>
                <Button onClick={() => handleAuth('up')} disabled={authBusy}>
                  Create account
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <p className="px-2 text-center text-[11px] text-ink-700">Tally.ly — your inventory &amp; money, tallied.</p>
    </div>
  )
}
