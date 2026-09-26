import { useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useDialogFocus } from '../../hooks/useDialogFocus'

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useDialogFocus(open, onCancel, dialogRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'relative z-10 mx-4 w-full max-w-sm animate-scale-in rounded-xl shadow-lg',
          'border border-edge bg-surface',
          'dark:border-edge-dark dark:bg-surface-dark',
        )}
      >
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex-1">
            <h3 id={titleId} className="text-sm font-semibold text-fg dark:text-fg-dark">
              {title}
            </h3>
            <p
              id={descriptionId}
              className="mt-1.5 text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary"
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="-mr-1 -mt-0.5 rounded-md p-1 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex justify-end gap-2 p-5 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-surface-secondary dark:text-fg-dark-secondary dark:hover:bg-surface-dark-elevated"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50',
              variant === 'danger'
                ? 'bg-danger hover:bg-danger-hover dark:bg-danger dark:hover:bg-danger-hover'
                : 'bg-fg hover:opacity-90 dark:bg-fg-dark dark:text-app-dark',
            )}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
