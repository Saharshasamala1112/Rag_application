import { useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useDialogFocus } from '../../hooks/useDialogFocus'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useDialogFocus(open, onClose, panelRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 mx-4 w-full animate-scale-in rounded-xl border border-edge bg-surface shadow-lg',
          'dark:border-edge-dark dark:bg-surface-dark',
          'focus:outline-none',
          sizeStyles[size],
        )}
      >
        {(title || description) && (
          <div className="px-5 pb-0 pt-5">
            {title && (
              <h2 id={titleId} className="text-sm font-semibold text-fg dark:text-fg-dark">
                {title}
              </h2>
            )}
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary"
              >
                {description}
              </p>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 pb-5">{footer}</div>}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
