import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Mic, Camera, Image, Send, Square, Loader2 } from 'lucide-react'
import type { Entry, EntryDraft, EntrySource, EntryType } from '@/types'
import { extractEntries, isGeminiConfigured } from '@/lib/gemini'
import { useRecorder } from '@/hooks/useRecorder'
import { useEntries } from '@/contexts/EntriesContext'
import { loadSettings } from '@/lib/settings'
import { blobToBase64, imageFileToBase64, cn } from '@/lib/utils'
import { ConfirmSheet } from '@/components/capture/ConfirmSheet'

function buildInventoryContext(entries: import('@/types').Entry[]): import('@/lib/gemini').InventoryContextItem[] {
  const familyMap = new Map<string, import('@/lib/gemini').InventoryContextItem>()
  for (const e of entries) {
    if (!e.product?.trim()) continue
    const family = e.subcategory?.trim() || e.product.trim()
    const key = `${e.category}::${family}`
    const item = familyMap.get(key) ?? { family, category: e.category, components: [] }
    const compName = e.product.trim()
    if (!item.components.some((c) => c.name === compName)) {
      item.components.push({ name: compName, unit: e.unit })
    }
    familyMap.set(key, item)
  }
  return Array.from(familyMap.values())
}

export function CapturePanel() {
  const { add, entries } = useEntries()
  const recorder = useRecorder()
  const settings = loadSettings()

  const [mode, setMode] = useState<EntryType>('expense')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState<EntryDraft[]>([])
  const [source, setSource] = useState<EntrySource>('text')
  const [usedFallback, setUsedFallback] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const runExtraction = async (
    args: { text?: string; audio?: { base64: string; mimeType: string }; image?: { base64: string; mimeType: string } },
    src: EntrySource,
  ) => {
    setBusy(true)
    try {
      const result = await extractEntries({
        ...args,
        defaultType: mode,
        currency: settings.currency,
        inventoryContext: buildInventoryContext(entries),
      })
      if (result.drafts.length === 0) {
        toast.error('Nothing to add — try again')
        return
      }
      setDrafts(result.drafts)
      setSource(src)
      setUsedFallback(result.usedFallback)
      setConfirmOpen(true)
    } catch (err) {
      console.error('[capture] extraction failed:', err)
      toast.error(err instanceof Error ? err.message : 'Could not read that — try again')
    } finally {
      setBusy(false)
    }
  }

  const handleText = async () => {
    const value = text.trim()
    if (!value) return
    await runExtraction({ text: value }, 'text')
    setText('')
  }

  const handleMic = async () => {
    if (!isGeminiConfigured) {
      toast('Voice needs the AI key. Type it for now, or add VITE_GEMINI_API_KEY.', { icon: '🎤' })
      return
    }
    if (recorder.isRecording) {
      const result = await recorder.stop()
      if (!result) {
        toast.error('No audio captured')
        return
      }
      const base64 = await blobToBase64(result.blob)
      await runExtraction({ audio: { base64, mimeType: result.mimeType.split(';')[0] } }, 'voice')
    } else {
      try {
        await recorder.start()
      } catch {
        toast.error('Microphone permission needed')
      }
    }
  }

  const handlePhoto = async (file: File) => {
    if (!isGeminiConfigured) {
      toast('Receipt photos need the AI key. Type it for now, or add VITE_GEMINI_API_KEY.', { icon: '📸' })
      return
    }
    // Resize + convert to JPEG via canvas — normalises HEIC from iOS and keeps payload small
    const base64 = await imageFileToBase64(file)
    await runExtraction({ image: { base64, mimeType: 'image/jpeg' } }, 'photo')
  }

  const handleConfirm = async (entries: Entry[]) => {
    try {
      for (const entry of entries) await add(entry)
      toast.success(entries.length > 1 ? `${entries.length} items saved` : 'Saved')
      setConfirmOpen(false)
      setDrafts([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(['income', 'expense', 'inventory'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-xl border py-2 text-xs font-medium transition-colors',
              mode === m
                ? 'border-gold-500 bg-gold-500/10 text-gold-300'
                : 'border-white/10 bg-white/[0.05] text-ink-400',
            )}
          >
            {m === 'income' ? '💰 Income' : m === 'expense' ? '💸 Expense' : '📦 Inventory'}
          </button>
        ))}
      </div>

      <p className="mb-3 -mt-1 text-center text-[10px] text-ink-600">
        AI will classify as <span className="text-gold-400">{mode}</span> unless it clearly identifies something else
      </p>

      {/* Voice + photo buttons */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <button
          onClick={handleMic}
          disabled={busy}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border py-6 transition-colors disabled:opacity-50',
            recorder.isRecording
              ? 'animate-pulse border-danger bg-danger/15 text-danger'
              : 'border-white/10 bg-white/[0.05] text-ink-300 hover:border-gold-500',
          )}
        >
          {recorder.isRecording ? <Square size={24} /> : <Mic size={24} />}
          <span className="text-xs font-medium">{recorder.isRecording ? 'Stop' : 'Speak'}</span>
        </button>

        <button
          onClick={() => cameraRef.current?.click()}
          disabled={busy || recorder.isRecording}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] py-6 text-ink-300 transition-colors hover:border-gold-500 disabled:opacity-50"
        >
          <Camera size={24} />
          <span className="text-xs font-medium">Camera</span>
        </button>

        <button
          onClick={() => galleryRef.current?.click()}
          disabled={busy || recorder.isRecording}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] py-6 text-ink-300 transition-colors hover:border-gold-500 disabled:opacity-50"
        >
          <Image size={24} />
          <span className="text-xs font-medium">Gallery</span>
        </button>

        {/* Camera: opens directly to camera on mobile */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handlePhoto(file)
            e.target.value = ''
          }}
        />
        {/* Gallery: opens file picker / photo library */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handlePhoto(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Text input */}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleText()}
          onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          placeholder='Type it — e.g. "spent 40 on gas"'
          disabled={busy || recorder.isRecording}
          className="flex-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-3 text-sm text-ink-300 placeholder:text-ink-600 outline-none backdrop-blur-sm focus:border-gold-500 disabled:opacity-50"
        />
        <button
          onClick={handleText}
          disabled={busy || !text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-ink-950 disabled:opacity-40"
          aria-label="Add"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {busy && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-cyan-300">
          <Loader2 size={12} className="animate-spin" /> Reading what you said…
        </p>
      )}

      <ConfirmSheet
        open={confirmOpen}
        drafts={drafts}
        source={source}
        currency={settings.currency}
        lowStockDefault={settings.lowStockDefault}
        usedFallback={usedFallback}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
