import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, FileText, Copy, Check, AlertCircle } from 'lucide-react'
import type { ChatMessage, ChatSource } from '../../types/chat'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded text-fg-tertiary dark:text-fg-dark-tertiary hover:text-fg-secondary dark:hover:text-fg-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors"
      aria-label="Copy message"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  onSelectSource?: (sources: ChatSource[]) => void
}

export function MessageBubble({ message, onSelectSource }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const hasSources = message.sources && message.sources.length > 0
  const isError = message.content.startsWith('Error:')

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[75%] min-w-0">
          <div className="rounded-2xl rounded-br-md bg-fg dark:bg-fg-dark text-app dark:text-app-dark px-4 py-2.5 shadow-xs">
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
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
      <div className="w-full max-w-[85%] min-w-0">
        {/* Assistant label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 dark:bg-accent-dark/10">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-accent dark:text-accent-dark"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-2xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
            Assistant
          </span>
          <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">·</span>
          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {formatTime(message.createdAt)}
          </span>
          {message.isStreaming && (
            <>
              <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">·</span>
              <span className="inline-flex items-center gap-1 text-2xs text-accent dark:text-accent-dark">
                <span className="flex gap-[3px]">
                  <span className="w-[3px] h-[3px] rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-[3px] h-[3px] rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-[3px] h-[3px] rounded-full bg-current animate-bounce" />
                </span>
                <span className="ml-0.5">thinking</span>
              </span>
            </>
          )}
        </div>

        {/* Error state */}
        {isError && !message.isStreaming && (
          <div className="rounded-xl border border-danger/30 dark:border-danger-dark/30 bg-danger-subtle dark:bg-danger-dark-subtle px-4 py-3 mb-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-danger dark:text-danger-dark mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger dark:text-danger-dark">Something went wrong</p>
                <p className="text-xs text-danger/80 dark:text-danger-dark/80 mt-1">
                  {message.content.replace('Error: ', '')}
                </p>
                <p className="text-2xs text-danger/60 dark:text-danger-dark/60 mt-2">
                  Try rephrasing your question or uploading different documents.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Markdown content */}
        {!isError && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content ||
                (message.isStreaming ? '' : 'No response generated.')}
            </ReactMarkdown>
            {message.isStreaming && message.content && (
              <span className="inline-block h-[14px] w-[2px] bg-accent dark:bg-accent-dark animate-pulse ml-0.5 align-middle rounded-full" />
            )}
            {message.isStreaming && !message.content && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-fg-muted dark:bg-fg-dark-tertiary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-fg-muted dark:bg-fg-dark-tertiary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-fg-muted dark:bg-fg-dark-tertiary animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sources — only when not streaming and sources exist */}
        {hasSources && !message.isStreaming && (
          <div className="mt-4 border border-edge dark:border-edge-dark rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
            <button
              type="button"
              onClick={() => setSourcesExpanded((prev) => !prev)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors"
            >
              <ChevronDown
                size={13}
                className={`text-fg-tertiary dark:text-fg-dark-tertiary transition-transform duration-200 shrink-0 ${
                  sourcesExpanded ? 'rotate-180' : ''
                }`}
              />
              <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                Sources · {message.sources!.length}
              </span>
              {!sourcesExpanded && onSelectSource && (
                <span className="ml-auto text-2xs text-accent dark:text-accent-dark hover:underline xl:hidden">
                  Open in panel
                </span>
              )}
            </button>

            {sourcesExpanded && (
              <div className="px-4 pb-3 space-y-2 border-t border-edge/50 dark:border-edge-dark/50">
                {message.sources!.map((source, idx) => (
                  <div
                    key={`${source.source}-${source.chunk_id}-${idx}`}
                    className="rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated p-3 mt-2"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/10 dark:bg-accent-dark/10 text-2xs font-semibold text-accent dark:text-accent-dark">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-medium text-fg-secondary dark:text-fg-dark-secondary truncate">
                        {source.source}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {source.page_number != null && (
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                            p.{source.page_number}
                          </span>
                        )}
                        {source.score != null && (
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                            · {Math.round(source.score * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {source.header && (
                      <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mb-1 italic">
                        {source.header}
                      </p>
                    )}
                    <p className="text-[11px] text-fg-secondary dark:text-fg-dark-secondary line-clamp-2 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copy button for completed messages */}
        {!message.isStreaming && message.content && !isError && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}
