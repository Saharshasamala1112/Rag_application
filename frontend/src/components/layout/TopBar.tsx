import { PanelLeft, Loader2 } from 'lucide-react'
import { useDocumentStore } from '../../store/document.store'

interface TopBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  loading: boolean
  status: string | null
}

export function TopBar({ sidebarOpen, onToggleSidebar, loading, status }: TopBarProps) {
  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)

  const activeDoc = documents.find((d) => d.document_id === activeDocumentId)

  return (
    <header className="flex items-center gap-3 h-12 px-4 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
      {!sidebarOpen && (
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <PanelLeft size={16} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {activeDoc ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">Querying:</span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {activeDoc.filename}
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {documents.length > 0
              ? `${documents.length} document${documents.length !== 1 ? 's' : ''} available`
              : 'Upload documents to get started'}
          </p>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Loader2 size={12} className="text-emerald-500 animate-spin" />
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {status || 'Thinking...'}
          </span>
        </div>
      )}
    </header>
  )
}
