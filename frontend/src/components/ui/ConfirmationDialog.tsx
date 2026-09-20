import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
        className="relative z-10 w-full max-w-sm mx-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg animate-scale-in"
      >
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex-1">
            <h3 id="dialog-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p id="dialog-desc" className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 -mt-0.5 -mr-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex justify-end gap-2 p-5 pt-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300'
            }`}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
