import { X } from 'lucide-react'
import { RagTracePanel } from './RagTracePanel'
import { cn } from '../../lib/utils'

interface ContextPanelProps {
  open: boolean
  onClose: () => void
}

export function ContextPanel({ open, onClose }: ContextPanelProps) {
  return (
    <aside
      className={cn(
        'flex flex-col h-full border-l border-edge dark:border-edge-dark',
        'bg-surface dark:bg-surface-dark',
        'transition-all duration-200 ease-in-out',
        open ? 'w-96' : 'w-0',
        'overflow-hidden',
      )}
    >
      {open && (
        <>
          <div className="flex h-12 items-center justify-between px-4 border-b border-edge dark:border-edge-dark shrink-0">
            <span className="text-2xs font-semibold text-fg-secondary dark:text-fg-dark-secondary uppercase tracking-wider">
              RAG Trace
            </span>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                'text-fg-tertiary hover:text-fg hover:bg-surface-secondary',
                'dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated',
              )}
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RagTracePanel />
          </div>
        </>
      )}
    </aside>
  )
}
