import { X } from 'lucide-react'
import { RagTracePanel } from './RagTracePanel'

interface RightPanelProps {
  open: boolean
  onClose: () => void
}

export function RightPanel({ open, onClose }: RightPanelProps) {
  return (
    <aside
      className={`flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-200 ease-in-out ${
        open ? 'w-96' : 'w-0'
      } overflow-hidden`}
    >
      {open && (
        <>
          <div className="flex h-12 items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              RAG Trace
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
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
