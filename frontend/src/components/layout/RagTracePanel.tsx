import { Layers } from 'lucide-react'
import { useChatStore } from '../../store/chat.store'

export function RagTracePanel() {
  const messages = useChatStore((s) => s.messages)
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  if (!lastAssistant) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Layers size={18} className="text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Send a message to see the RAG retrieval trace
        </p>
      </div>
    )
  }

  const sources = lastAssistant.sources || []

  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Sources ({sources.length})
        </h4>
        {sources.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No sources retrieved</p>
        ) : (
          <div className="space-y-2">
            {sources.map((src, i) => (
              <div
                key={`${src.chunk_id}-${i}`}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    #{i + 1}
                  </span>
                  {src.score != null && (
                    <span className="text-[10px] text-zinc-400">
                      {(src.score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                  {src.content}
                </p>
                {src.source && (
                  <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                    {src.source}
                    {src.page_number != null ? ` · p.${src.page_number}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
