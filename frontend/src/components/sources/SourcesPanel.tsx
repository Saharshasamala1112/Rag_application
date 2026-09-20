import { X, FileText, Copy } from 'lucide-react'
import type { ChatSource } from '../../types/chat'
import { toast } from 'sonner'

interface SourcesPanelProps {
  sources: ChatSource[]
  onClose: () => void
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Citation copied'),
    () => toast.error('Failed to copy'),
  )
}

export function SourcesPanel({ sources, onClose }: SourcesPanelProps) {
  if (!sources.length) return null

  return (
    <aside
      className="w-[340px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 overflow-y-auto hidden xl:flex flex-col"
      role="complementary"
      aria-label="Sources"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Sources ({sources.length})
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sources panel"
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {sources.map((source, idx) => (
          <div
            key={`${source.source}-${source.chunk_id}-${idx}`}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/60 p-3 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <FileText size={13} className="text-zinc-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {source.source}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {source.page_number && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Page {source.page_number}
                    </span>
                  )}
                  {source.header && (
                    <>
                      <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                        {source.header}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-4 mb-2">
              {source.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `> ${source.content}\n— ${source.source}${source.page_number ? `, p.${source.page_number}` : ''}`
                  )
                }
                className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <Copy size={10} />
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
