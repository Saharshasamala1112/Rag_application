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
          <div className="rounded-2xl rounded-br-md bg-fg dark:bg-fg-dark text-app dark:text-app-dark px-4 py-2.5">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {message.content}
            </p>
          </div>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mt-1 text-right">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="w-full max-w-[80%] min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-fg dark:bg-fg-dark flex items-center justify-center shrink-0">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-app dark:text-app-dark"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-fg-secondary dark:text-fg-dark-secondary">
            RAG Workspace
          </span>
          <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">·</span>
          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {formatTime(message.createdAt)}
          </span>
          {message.isStreaming && (
            <>
              <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">·</span>
              <span className="text-2xs text-accent dark:text-accent-dark animate-pulse">streaming</span>
            </>
          )}
        </div>

        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content ||
              (message.isStreaming ? '' : 'No response generated.')}
          </ReactMarkdown>
          {message.isStreaming && (
            <span className="inline-block h-4 w-[2px] bg-fg dark:bg-fg-dark animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {hasSources && (
          <div className="mt-3 border border-edge dark:border-edge-dark rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSourcesExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors"
            >
              <ChevronDown
                size={12}
                className={`text-fg-tertiary dark:text-fg-dark-tertiary transition-transform duration-200 shrink-0 ${
                  sourcesExpanded ? 'rotate-180' : ''
                }`}
              />
              <span className="text-2xs font-medium uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                Sources ({message.sources!.length})
              </span>
              {!sourcesExpanded && onSelectSource && (
                <span className="ml-auto text-2xs text-accent dark:text-accent-dark hover:underline xl:hidden">
                  Open in panel →
                </span>
              )}
            </button>

            {sourcesExpanded && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-edge/50 dark:border-edge-dark/50">
                {message.sources!.map((source, idx) => (
                  <div
                    key={`${source.source}-${source.chunk_id}-${idx}`}
                    className="rounded-md bg-surface-secondary dark:bg-surface-dark-elevated p-2.5 mt-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={11} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
                      <span className="text-[11px] font-medium text-fg-secondary dark:text-fg-dark-secondary truncate">
                        {source.source}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {source.page_number && (
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                            p.{source.page_number}
                          </span>
                        )}
                        {source.header && (
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary truncate max-w-[120px]">
                            {source.header}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-fg-secondary dark:text-fg-dark-secondary line-clamp-2 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isUser && hasSources && !sourcesExpanded && onSelectSource && (
          <button
            type="button"
            onClick={() => onSelectSource(message.sources!)}
            className="xl:hidden mt-1.5 text-2xs font-medium text-fg-tertiary hover:text-accent dark:hover:text-accent-dark transition-colors"
          >
            View all sources in panel →
          </button>
        )}
      </div>
    </div>
  )
}
