import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useEntries } from '@/contexts/EntriesContext'
import { DEFAULT_CATEGORY_ID, type CategoryDef } from '@/config/categories'
import { useCategories, normalizeCategoryId, addCategory, updateCategory, removeCategory } from '@/lib/categoryStore'
import { loadSettings, saveSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { isGeminiConfigured, loadGeminiKey, saveGeminiKey } from '@/lib/gemini'
import { isSheetsConfigured, loadSheetsConfig, saveSheetsConfig } from '@/lib/sheets'
import {
  HardDrive,
  Sparkles,
  Sheet as SheetIcon,
  Check,
  X,
  Trash2,
  Download,
  AlertTriangle,
  Pencil,
  Plus,
} from 'lucide-react'

const DELETE_ALL_CONFIRM_WORD = 'DELETE'

const SWATCHES = ['#34A853', '#4285F4', '#00F2EA', '#F9AB00', '#EA4335', '#9C27B0', '#9aa0a6']

interface CategoryFormState {
  label: string
  emoji: string
  color: string
}

const BLANK_CATEGORY_FORM: CategoryFormState = { label: '', emoji: '🔵', color: SWATCHES[0] }

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
  const categories = useCategories()
  const [clearing, setClearing] = useState(false)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('')
  const [deletingAll, setDeletingAll] = useState(false)
  const [showClearOther, setShowClearOther] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryDef | null>(null)
  // Personal connections, kept only in this browser. `connectionsVersion` re-reads their status after saving.
  const [geminiKeyInput, setGeminiKeyInput] = useState(loadGeminiKey())
  const [sheetsInput, setSheetsInput] = useState(loadSheetsConfig())
  const [connectionsVersion, setConnectionsVersion] = useState(0)

  const otherEntries = entries.filter((e) => normalizeCategoryId(e.category) === 'other')

  const openAddCategory = () => {
    setEditingCategoryId(null)
    setCategoryForm({ ...BLANK_CATEGORY_FORM })
  }

  const openEditCategory = (cat: CategoryDef) => {
    setEditingCategoryId(cat.id)
    setCategoryForm({ label: cat.label, emoji: cat.emoji, color: cat.color })
  }

  const handleSaveCategory = () => {
    if (!categoryForm || !categoryForm.label.trim()) return
    if (editingCategoryId) {
      updateCategory(editingCategoryId, categoryForm)
    } else {
      addCategory(categoryForm)
    }
    setCategoryForm(null)
    setEditingCategoryId(null)
  }

  const handleDeleteCategory = () => {
    if (!deletingCategory) return
    removeCategory(deletingCategory.id)
    setDeletingCategory(null)
  }

  const entryCountFor = (categoryId: string) => entries.filter((e) => e.category === categoryId).length

  const updateSettings = (patch: Partial<typeof settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const handleExport = () => {
    if (entries.length === 0) {
      toast('No entries to export')
      return
    }
    const json = JSON.stringify(entries, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tally-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${entries.length} entries`)
  }

  const handleClearOther = async () => {
    if (otherEntries.length === 0) {
      toast('Nothing to clear')
      return
    }
    setShowClearOther(false)
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

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== DELETE_ALL_CONFIRM_WORD) return
    setDeletingAll(true)
    try {
      // Sequential, not Promise.all — each delete also fires a Sheets sync
      // call (pushToSheet('delete', ...)); running them in parallel would
      // hammer the Apps Script webhook with concurrent requests.
      for (const e of entries) await remove(e)
      toast.success('All data deleted')
      setShowDeleteAll(false)
      setDeleteAllConfirmText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete everything — some entries may remain')
    } finally {
      setDeletingAll(false)
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
          ok={connectionsVersion >= 0 && isGeminiConfigured()}
          label={<><Sparkles size={15} /> AI (voice &amp; photo)</>}
          on="On"
          off="Demo mode"
        />
        <StatusRow
          ok={connectionsVersion >= 0 && isSheetsConfigured()}
          label={<><SheetIcon size={15} /> Google Sheets</>}
          on="On"
          off="Off"
        />
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ink-800/60 px-2.5 py-2 text-[11px] text-ink-500">
          <HardDrive size={13} className="mt-0.5 shrink-0" />
          {isSheetsConfigured()
            ? 'Everything you add is saved on this device and copied to your Google Sheet automatically.'
            : 'Everything you add is saved on this device.'}
        </p>
      </Card>

      {/* Personal connections */}
      <Card className="px-4 py-4">
        <h2 className="mb-1 text-sm font-bold text-ink-300">Use your own accounts</h2>
        <p className="mb-3 text-[11px] text-ink-500">
          Optional. Connect your own Gemini key and Google Sheet. They are stored only in this browser and
          sent only to Google. Without them, entries stay on this device.
        </p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Gemini API key</span>
          <input
            type="password"
            value={geminiKeyInput}
            onChange={(e) => setGeminiKeyInput(e.target.value)}
            autoComplete="off"
            placeholder="Paste your key from aistudio.google.com/apikey"
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Google Sheets web app URL</span>
          <input
            type="url"
            value={sheetsInput.url}
            onChange={(e) => setSheetsInput({ ...sheetsInput, url: e.target.value })}
            autoComplete="off"
            placeholder="https://script.google.com/macros/s/…/exec"
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Sheets token</span>
          <input
            type="password"
            value={sheetsInput.token}
            onChange={(e) => setSheetsInput({ ...sheetsInput, token: e.target.value })}
            autoComplete="off"
            placeholder="The TALLY_TOKEN you set in Apps Script"
            className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
          />
        </label>
        <Button
          onClick={() => {
            if (sheetsInput.url.trim() && !sheetsInput.url.trim().startsWith('https://')) {
              toast.error('The Sheets URL must start with https://')
              return
            }
            saveGeminiKey(geminiKeyInput)
            saveSheetsConfig(sheetsInput)
            setConnectionsVersion((v) => v + 1)
            toast.success('Connections saved on this device')
          }}
        >
          <Check size={14} />
          Save connections
        </Button>
      </Card>

      {/* Categories */}
      <Card className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-300">Categories</h2>
          <Button variant="secondary" onClick={openAddCategory}>
            <Plus size={14} />
            Add
          </Button>
        </div>
        <p className="mb-3 text-xs text-ink-500">
          Add, rename or remove the projects you track against. Entries in a removed category move to “Other”.
        </p>
        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl bg-ink-800/60 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-ink-300">
                <span>{cat.emoji}</span>
                {cat.label}
              </span>
              <div className="flex items-center gap-1 text-ink-500">
                <button
                  onClick={() => openEditCategory(cat)}
                  aria-label={`Edit ${cat.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:text-cyan-300 active:bg-white/5"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeletingCategory(cat)}
                  disabled={cat.id === DEFAULT_CATEGORY_ID}
                  aria-label={`Delete ${cat.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:text-danger active:bg-white/5 disabled:opacity-30 disabled:hover:text-ink-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Sheet
        open={categoryForm !== null}
        title={editingCategoryId ? 'Edit category' : 'Add category'}
        onClose={() => setCategoryForm(null)}
      >
        {categoryForm && (
          <>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-ink-400">Name</span>
              <input
                autoFocus
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                placeholder="e.g. Freelance, Garden, Side Hustle…"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-gold-500"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-ink-400">Emoji</span>
              <input
                value={categoryForm.emoji}
                onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
                maxLength={4}
                className="w-20 rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-center text-lg outline-none focus:border-gold-500"
              />
            </label>
            <div className="mb-4">
              <span className="mb-1 block text-xs font-medium text-ink-400">Color</span>
              <div className="flex gap-2">
                {SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setCategoryForm({ ...categoryForm, color: hex })}
                    aria-label={hex}
                    className={cn(
                      'h-8 w-8 rounded-full border-2',
                      categoryForm.color === hex ? 'border-white' : 'border-transparent',
                    )}
                    style={{ background: hex }}
                  />
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={!categoryForm.label.trim()} onClick={handleSaveCategory}>
              <Check size={15} />
              {editingCategoryId ? 'Save changes' : 'Add category'}
            </Button>
          </>
        )}
      </Sheet>

      <Sheet open={deletingCategory !== null} title="Remove category?" onClose={() => setDeletingCategory(null)}>
        {deletingCategory && (
          <>
            <p className="mb-4 text-sm text-ink-300">
              {entryCountFor(deletingCategory.id) > 0
                ? `${entryCountFor(deletingCategory.id)} ${
                    entryCountFor(deletingCategory.id) === 1 ? 'entry' : 'entries'
                  } in “${deletingCategory.label}” will move to “Other”.`
                : `Removes “${deletingCategory.label}”. No entries use it yet.`}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeletingCategory(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDeleteCategory}>
                <Trash2 size={15} />
                Remove
              </Button>
            </div>
          </>
        )}
      </Sheet>

      {/* Backup */}
      <Card className="px-4 py-4">
        <h2 className="mb-1 text-sm font-bold text-ink-300">Backup</h2>
        <p className="mb-3 text-xs text-ink-500">
          Download all your data as a JSON file. Keep it safe — it's your only backup if this device is lost.
        </p>
        <Button variant="secondary" onClick={handleExport}>
          <Download size={15} />
          Download all data ({entries.length} entries)
        </Button>
      </Card>

      {/* Maintenance */}
      <Card className="px-4 py-4">
        <h2 className="mb-1 text-sm font-bold text-ink-300">Maintenance</h2>
        <p className="mb-3 text-xs text-ink-500">Remove old test entries that landed in “Other”.</p>
        <Button
          variant="danger"
          onClick={() => setShowClearOther(true)}
          disabled={clearing || otherEntries.length === 0}
        >
          <Trash2 size={15} />
          {clearing ? 'Clearing…' : `Clear “Other” (${otherEntries.length})`}
        </Button>
      </Card>

      <Sheet open={showClearOther} title="Clear “Other” entries?" onClose={() => setShowClearOther(false)}>
        <p className="mb-4 text-sm text-ink-300">
          This permanently deletes {otherEntries.length} {otherEntries.length === 1 ? 'entry' : 'entries'} filed
          under “Other” — on this device and in your Google Sheet. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowClearOther(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleClearOther}>
            <Trash2 size={15} />
            Delete {otherEntries.length}
          </Button>
        </div>
      </Sheet>

      {/* Danger zone — kept visually separate from Backup/Maintenance on purpose */}
      <Card className="border-danger/40 bg-danger/[0.04] px-4 py-4">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-danger">
          <AlertTriangle size={15} /> Danger zone
        </h2>
        <p className="mb-3 text-xs text-ink-500">
          Permanently deletes every entry — inventory, expenses and income — on this device and in your connected
          Google Sheet. There is no undo. Download a backup above first if you want one.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteAll(true)}
          disabled={entries.length === 0}
        >
          <Trash2 size={15} />
          Delete ALL data ({entries.length})
        </Button>
      </Card>

      <Sheet
        open={showDeleteAll}
        title="Delete everything?"
        onClose={() => {
          setShowDeleteAll(false)
          setDeleteAllConfirmText('')
        }}
      >
        <p className="mb-3 text-sm text-ink-300">
          This permanently deletes all {entries.length} entries on this device and in your Google Sheet. This
          cannot be undone.
        </p>
        <p className="mb-1 text-xs font-medium text-ink-400">
          Type <span className="font-mono text-danger">{DELETE_ALL_CONFIRM_WORD}</span> to confirm:
        </p>
        <input
          autoFocus
          value={deleteAllConfirmText}
          onChange={(e) => setDeleteAllConfirmText(e.target.value)}
          className="mb-4 w-full rounded-xl border border-danger/40 bg-ink-800 px-3 py-2.5 text-sm text-ink-300 outline-none focus:border-danger"
          placeholder={DELETE_ALL_CONFIRM_WORD}
        />
        <Button
          variant="danger"
          className="w-full"
          disabled={deleteAllConfirmText !== DELETE_ALL_CONFIRM_WORD || deletingAll}
          onClick={handleDeleteAll}
        >
          <Trash2 size={15} />
          {deletingAll ? `Deleting… ${entries.length} left` : 'Permanently delete everything'}
        </Button>
      </Sheet>

      <p className="px-2 text-center text-[11px] text-ink-700">卌 Tally — build {__BUILD_ID__} UTC</p>
    </div>
  )
}
