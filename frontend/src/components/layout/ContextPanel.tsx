import { X } from 'lucide-react'
import { RagTracePanel } from './RagTracePanel'
import { cn } from '../../lib/utils'
import type { ChatSource } from '../../types/chat'

interface ContextPanelProps {
  open: boolean
  onClose: () => void
  selectedSource?: ChatSource | null
  /** Desktop layout: the panel sits in the flow. Below `lg` it is a right-hand sheet. */
  isDesktop: boolean
}

export function ContextPanel({ open, onClose, selectedSource, isDesktop }: ContextPanelProps) {
  const isSheet = !isDesktop

  // The sheet only exists while open, so a closed panel stays out of the
  // accessibility tree on small screens.
  if (isSheet && !open) return null

  return (
    <>
      {isSheet && open && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
          data-testid="context-panel-backdrop"
        />
      )}
      <aside
        className={cn(
          'flex h-full flex-col border-l border-edge dark:border-edge-dark',
          'bg-surface dark:bg-surface-dark',
          isDesktop
            ? 'overflow-hidden transition-all duration-200 ease-in-out'
            : 'fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] shadow-xl',
          isDesktop && (open ? 'w-96' : 'w-0'),
        )}
      >
        {open && (
          <>
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-edge px-4 dark:border-edge-dark">
              <span className="text-2xs font-semibold uppercase tracking-wider text-fg-secondary dark:text-fg-dark-secondary">
                RAG Trace
              </span>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  'text-fg-tertiary hover:bg-surface-secondary hover:text-fg',
                  'dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark',
                )}
                aria-label="Close panel"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedSource && (
                <section
                  className="border-b border-edge px-4 py-3 dark:border-edge-dark"
                  aria-label="Selected source"
                >
                  <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                    Selected source
                  </p>
                  <p className="mt-1 text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
                    {selectedSource.source}
                    {selectedSource.page_number != null ? ` · p.${selectedSource.page_number}` : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
                    {selectedSource.content}
                  </p>
                </section>
              )}
              <RagTracePanel />
            </div>
          </>
        )}
      </aside>
    </>
  )
}
