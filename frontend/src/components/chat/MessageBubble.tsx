import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, FileText } from 'lucide-react'
import type { ChatMessage, ChatSource } from '../../types/chat'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface MessageBubbleProps {
  message: ChatMessage
  onSelectSource?: (sources: ChatSource[]) => void
}

export function MessageBubble({ message, onSelectSource }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const hasSources = message.sources && message.sources.length > 0

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2.5">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {message.content}
            </p>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 text-right">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="w-full max-w-[80%] min-w-0">
        {/* Assistant header */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-white dark:text-zinc-900"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            DocuChat
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {formatTime(message.createdAt)}
          </span>
          {message.isStreaming && (
            <>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
              <span className="text-[10px] text-emerald-500 animate-pulse">streaming</span>
            </>
          )}
        </div>

        {/* Message body */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content ||
              (message.isStreaming ? '' : 'No response generated.')}
          </ReactMarkdown>
          {message.isStreaming && (
            <span className="inline-block h-4 w-[2px] bg-zinc-900 dark:bg-zinc-200 animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {/* Inline sources */}
        {hasSources && (
          <div className="mt-3 border border-zinc-200 dark:border-zinc-700/50 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSourcesExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <ChevronDown
                size={12}
                className={`text-zinc-400 transition-transform duration-200 shrink-0 ${
                  sourcesExpanded ? 'rotate-180' : ''
                }`}
              />
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Sources ({message.sources!.length})
              </span>
              {!sourcesExpanded && onSelectSource && (
                <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline xl:hidden">
                  Open in panel →
                </span>
              )}
            </button>

            {sourcesExpanded && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-zinc-100 dark:border-zinc-700/30">
                {message.sources!.map((source, idx) => (
                  <div
                    key={`${source.source}-${source.chunk_id}-${idx}`}
                    className="rounded-md bg-zinc-50 dark:bg-zinc-800/40 p-2.5 mt-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={11} className="text-zinc-400 shrink-0" />
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {source.source}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {source.page_number && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            p.{source.page_number}
                          </span>
                        )}
                        {source.header && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[120px]">
                            {source.header}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile panel trigger */}
        {!isUser && hasSources && !sourcesExpanded && onSelectSource && (
          <button
            type="button"
            onClick={() => onSelectSource(message.sources!)}
            className="xl:hidden mt-1.5 text-[10px] font-medium text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            View all sources in panel →
          </button>
        )}
      </div>
    </div>
  )
}
