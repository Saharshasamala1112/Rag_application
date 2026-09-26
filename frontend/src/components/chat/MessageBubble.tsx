import { Children, cloneElement, Fragment, isValidElement, memo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, FileText, Copy, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
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
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => toast.error('Failed to copy message'),
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded p-1 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg-secondary dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark-secondary"
      aria-label="Copy message"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  onSelectSource?: (source: ChatSource, messageId: string) => void
  onRetry?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
}

function renderCitationNodes(
  nodes: ReactNode,
  message: ChatMessage,
  onSelectSource: MessageBubbleProps['onSelectSource'],
  setSourcesExpanded: (expanded: boolean) => void,
  setSelectedSourceIndex: (index: number) => void,
): ReactNode {
  if (typeof nodes === 'string') {
    return nodes.split(/(\[Source\s+\d+\])/g).map((part, index) => {
      const citation = /^\[Source\s+(\d+)\]$/.exec(part)
      if (!citation) return part
      const sourceIndex = Number(citation[1]) - 1
      const source = message.sources?.[sourceIndex]
      if (!source) return part

      return (
        <button
          key={`${message.id}-citation-${index}`}
          type="button"
          className="mx-0.5 inline rounded bg-accent/10 px-1 text-accent underline decoration-dotted underline-offset-2 hover:bg-accent/20 dark:bg-accent-dark/10 dark:text-accent-dark"
          aria-label={`Open source ${sourceIndex + 1}: ${source.source}`}
          onClick={() => {
            setSourcesExpanded(true)
            setSelectedSourceIndex(sourceIndex)
            onSelectSource?.(source, message.id)
          }}
        >
          [{sourceIndex + 1}]
        </button>
      )
    })
  }

  if (Array.isArray(nodes)) {
    return Children.toArray(nodes).map((node, index) => (
      <Fragment key={`${message.id}-citation-node-${index}`}>
        {renderCitationNodes(
          node,
          message,
          onSelectSource,
          setSourcesExpanded,
          setSelectedSourceIndex,
        )}
      </Fragment>
    ))
  }

  if (
    isValidElement<{ children?: ReactNode }>(nodes) &&
    (nodes.type === 'code' || nodes.type === 'pre')
  ) {
    return nodes
  }

  if (isValidElement<{ children?: ReactNode }>(nodes) && nodes.props.children) {
    return cloneElement(
      nodes,
      {},
      renderCitationNodes(
        nodes.props.children,
        message,
        onSelectSource,
        setSourcesExpanded,
        setSelectedSourceIndex,
      ),
    )
  }

  return nodes
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onSelectSource,
  onRetry,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null)
  const hasSources = message.sources && message.sources.length > 0
  const isError = message.error === true

  useEffect(() => {
    if (selectedSourceIndex === null || !sourcesExpanded) return
    const source = message.sources?.[selectedSourceIndex]
    if (!source) return
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`source-${message.id}-${selectedSourceIndex}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [message.id, message.sources, selectedSourceIndex, sourcesExpanded])

  if (isUser) {
    return (
      <div className="flex animate-slide-up justify-end">
        <div className="min-w-0 max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-fg px-4 py-2.5 text-app shadow-xs dark:bg-fg-dark dark:text-app-dark">
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex animate-slide-up justify-start">
      <div className="w-full min-w-0 max-w-[85%]">
        {/* Assistant label */}
        <div className="mb-2 flex items-center gap-2">
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
                  <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-current" />
                </span>
                <span className="ml-0.5">thinking</span>
              </span>
            </>
          )}
          {message.interrupted && (
            <span className="rounded bg-warning-subtle px-1.5 py-0.5 text-2xs font-medium text-warning dark:bg-warning-dark-subtle dark:text-warning-dark">
              Stopped
            </span>
          )}
        </div>

        {/* Error state */}
        {isError && !message.isStreaming && (
          <div
            role="alert"
            className="mb-2 rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 dark:border-danger-dark/30 dark:bg-danger-dark-subtle"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                size={14}
                className="mt-0.5 shrink-0 text-danger dark:text-danger-dark"
              />
              <div>
                <p className="text-sm font-medium text-danger dark:text-danger-dark">
                  Something went wrong
                </p>
                <p className="mt-1 text-xs text-danger/80 dark:text-danger-dark/80">
                  {message.content}
                </p>
                <p className="mt-2 text-2xs text-danger/60 dark:text-danger-dark/60">
                  Try rephrasing your question or uploading different documents.
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    className="mt-3 rounded-md bg-danger px-2.5 py-1 text-2xs font-medium text-white hover:opacity-90"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Markdown content */}
        {!isError && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }) => (
                  <p {...props}>
                    {renderCitationNodes(
                      children,
                      message,
                      onSelectSource,
                      setSourcesExpanded,
                      setSelectedSourceIndex,
                    )}
                  </p>
                ),
                li: ({ children, ...props }) => (
                  <li {...props}>
                    {renderCitationNodes(
                      children,
                      message,
                      onSelectSource,
                      setSourcesExpanded,
                      setSelectedSourceIndex,
                    )}
                  </li>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote {...props}>
                    {renderCitationNodes(
                      children,
                      message,
                      onSelectSource,
                      setSourcesExpanded,
                      setSelectedSourceIndex,
                    )}
                  </blockquote>
                ),
              }}
            >
              {message.content || (message.isStreaming ? '' : 'No response generated.')}
            </ReactMarkdown>
            {message.isStreaming && message.content && (
              <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse rounded-full bg-accent align-middle dark:bg-accent-dark" />
            )}
            {message.isStreaming && !message.content && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fg-muted [animation-delay:-0.3s] dark:bg-fg-dark-tertiary" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fg-muted [animation-delay:-0.15s] dark:bg-fg-dark-tertiary" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fg-muted dark:bg-fg-dark-tertiary" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sources — only when not streaming and sources exist */}
        {hasSources && !message.isStreaming && (
          <div className="mt-4 overflow-hidden rounded-xl border border-edge bg-surface dark:border-edge-dark dark:bg-surface-dark">
            <button
              type="button"
              onClick={() => setSourcesExpanded((prev) => !prev)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated"
            >
              <ChevronDown
                size={13}
                className={`shrink-0 text-fg-tertiary transition-transform duration-200 dark:text-fg-dark-tertiary ${
                  sourcesExpanded ? 'rotate-180' : ''
                }`}
              />
              <FileText
                size={12}
                className="shrink-0 text-fg-tertiary dark:text-fg-dark-tertiary"
              />
              <span className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                Sources · {message.sources!.length}
              </span>
            </button>

            {sourcesExpanded && (
              <div className="space-y-2 border-t border-edge/50 px-4 pb-3 dark:border-edge-dark/50">
                {message.sources!.map((source, idx) => (
                  <div
                    key={`${source.source}-${source.chunk_id}-${idx}`}
                    id={`source-${message.id}-${idx}`}
                    aria-current={selectedSourceIndex === idx ? 'location' : undefined}
                    className={`mt-2 rounded-lg p-3 transition-colors ${
                      selectedSourceIndex === idx
                        ? 'bg-accent/15 ring-2 ring-accent dark:bg-accent-dark/15 dark:ring-accent-dark'
                        : 'bg-surface-secondary dark:bg-surface-dark-elevated'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/10 text-2xs font-semibold text-accent dark:bg-accent-dark/10 dark:text-accent-dark">
                        {idx + 1}
                      </span>
                      <span className="truncate text-[11px] font-medium text-fg-secondary dark:text-fg-dark-secondary">
                        {source.source}
                      </span>
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
                      <p className="mb-1 text-2xs italic text-fg-tertiary dark:text-fg-dark-tertiary">
                        {source.header}
                      </p>
                    )}
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
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
          <div className="mt-2 flex items-center gap-1">
            <CopyButton text={message.content} />
            {onRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="rounded px-2 py-1 text-2xs text-fg-tertiary hover:bg-surface-secondary hover:text-fg-secondary dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark-secondary"
              >
                Regenerate
              </button>
            )}
            {message.interrupted && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="rounded px-2 py-1 text-2xs text-accent hover:bg-accent/10 dark:text-accent-dark"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
