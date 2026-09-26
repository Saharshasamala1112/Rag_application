import { useState, useRef, useEffect } from 'react'
import { Search as SearchIcon, Send, FileText, Clock } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { queryDocuments } from '../services/query.service'
import { toast } from 'sonner'
import type { ChatSource } from '../types/chat'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/utils'

const HISTORY_KEY = 'rag-search-history'

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function saveHistory(query: string) {
  const history = loadHistory().filter((h) => h !== query)
  history.unshift(query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

export function SearchPage() {
  const documents = useDocumentStore((s) => s.documents)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatSource[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [history, setHistory] = useState<string[]>(() => loadHistory())
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)
  const requestControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const handleSearch = async (searchText = query) => {
    const q = searchText.trim()
    if (!q) return

    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    const requestId = ++requestIdRef.current

    setLoading(true)
    setResults([])
    setAnswer(null)
    setSearched(true)
    saveHistory(q)
    setHistory(loadHistory())

    try {
      const res = await queryDocuments(
        {
          question: q,
          use_reranking: true,
        },
        {
          signal: controller.signal,
          timeout: 30000,
        },
      )
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      setResults(res.sources)
      setAnswer(res.answer)
    } catch {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        toast.error('Search failed')
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSearch()
    }
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-edge px-6 dark:border-edge-dark">
        <div className="relative max-w-xl flex-1">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary dark:text-fg-dark-tertiary"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Semantic search across all documents..."
            className="w-full rounded-lg border border-edge bg-surface-secondary py-2 pl-9 pr-10 text-xs text-fg placeholder-fg-tertiary transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-edge-dark dark:bg-surface-dark-elevated dark:text-fg-dark dark:placeholder-fg-dark-tertiary"
          />
          {query && (
            <button
              type="button"
              onClick={() => void handleSearch()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-tertiary transition-colors hover:text-accent disabled:opacity-50 dark:hover:text-accent-dark"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!searched ? (
          <div className="mx-auto max-w-2xl px-6 py-8">
            <EmptyState
              icon={<SearchIcon size={24} />}
              title={
                documents.length === 0 ? 'No documents to search' : 'Search across all documents'
              }
              description={
                documents.length === 0
                  ? 'Upload documents first to enable search'
                  : `Searching across ${documents.length} document${documents.length !== 1 ? 's' : ''}`
              }
            />

            {history.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                    Recent searches
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-2xs text-fg-muted transition-colors hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {history.slice(0, 5).map((h, i) => (
                    <button
                      key={`${h}-${i}`}
                      type="button"
                      onClick={() => {
                        setQuery(h)
                        void handleSearch(h)
                      }}
                      className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary transition-colors hover:bg-surface-secondary dark:text-fg-dark-secondary dark:hover:bg-surface-dark-elevated"
                    >
                      <Clock
                        size={12}
                        className="shrink-0 text-fg-muted dark:text-fg-dark-tertiary"
                      />
                      <span className="flex-1 truncate">{h}</span>
                      <span className="text-2xs text-accent opacity-0 transition-opacity group-hover:opacity-100 dark:text-accent-dark">
                        Search →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="mx-auto max-w-2xl space-y-4 px-6 py-8">
            <div className="h-20 animate-pulse rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6 px-6 py-6">
            {answer && (
              <div className="rounded-xl border border-accent/20 bg-accent-subtle p-4 dark:border-accent-dark/20 dark:bg-accent-dark-subtle">
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-accent dark:text-accent-dark">
                  Answer
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
                  {answer}
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div>
                <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
                  Sources ({results.length})
                </p>
                <div className="space-y-2">
                  {results.map((src, i) => (
                    <div
                      key={`${src.chunk_id}-${i}`}
                      className={cn(
                        'rounded-lg border bg-surface p-4 transition-colors hover:border-edge-strong dark:bg-surface-dark dark:hover:border-edge-dark-strong',
                        i === 0
                          ? 'border-accent/30 dark:border-accent-dark/30'
                          : 'border-edge dark:border-edge-dark',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={12}
                            className="text-fg-tertiary dark:text-fg-dark-tertiary"
                          />
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                            {src.source}
                            {src.page_number != null ? ` · p.${src.page_number}` : ''}
                          </span>
                        </div>
                        {src.score != null && (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-secondary dark:bg-surface-dark-elevated">
                              <div
                                className="h-full rounded-full bg-accent dark:bg-accent-dark"
                                style={{ width: `${Math.min(src.score * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-2xs font-medium text-accent dark:text-accent-dark">
                              {Math.round(src.score * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
                        {src.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && answer && (
              <p className="text-center text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
                No source chunks found for this query.
              </p>
            )}

            {results.length === 0 && !answer && (
              <p className="text-center text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
                No results found for this query.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
