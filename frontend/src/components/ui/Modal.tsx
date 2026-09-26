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

export function Modal({ open, onClose, title, description, children, footer, size = 'sm' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useDialogFocus(open, onClose, panelRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
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
          'relative z-10 w-full mx-4 bg-surface border border-edge rounded-xl shadow-lg animate-scale-in',
          'dark:bg-surface-dark dark:border-edge-dark',
          'focus:outline-none',
          sizeStyles[size],
        )}
      >
        {(title || description) && (
          <div className="px-5 pt-5 pb-0">
            {title && (
              <h2 id={titleId} className="text-sm font-semibold text-fg dark:text-fg-dark">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-1 text-xs text-fg-secondary dark:text-fg-dark-secondary leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 pb-5">{footer}</div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
