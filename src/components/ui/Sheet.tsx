import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** A bottom sheet modal (mobile-friendly). */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-white/15 bg-[#0f0f1e]/85 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
          <h2 className="text-base font-bold text-ink-300">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-500 hover:text-ink-300">
            <X size={20} />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-ink-800 px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}
