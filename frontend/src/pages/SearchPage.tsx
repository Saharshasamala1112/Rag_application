import { useState, useRef } from 'react'
import { Search as SearchIcon, Send, FileText } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { queryDocuments } from '../services/query.service'
import { toast } from 'sonner'
import type { ChatSource } from '../types/chat'
import { EmptyState } from '../components/ui/EmptyState'

export function SearchPage() {
  const documents = useDocumentStore((s) => s.documents)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatSource[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setResults([])
    setAnswer(null)
    setSearched(true)

    try {
      const res = await queryDocuments({
        question: q,
        use_reranking: true,
      })
      setResults(res.sources)
      setAnswer(res.answer)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary dark:text-fg-dark-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Semantic search across all documents..."
            className="w-full pl-9 pr-10 py-2 text-xs bg-surface-secondary dark:bg-surface-dark-elevated border border-edge dark:border-edge-dark rounded-lg text-fg dark:text-fg-dark placeholder-fg-tertiary dark:placeholder-fg-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-fg-tertiary hover:text-accent dark:hover:text-accent-dark transition-colors disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!searched ? (
          <EmptyState
            icon={<SearchIcon size={24} />}
            title={documents.length === 0 ? 'No documents to search' : 'Search across all documents'}
            description={
              documents.length === 0
                ? 'Upload documents first to enable search'
                : `Searching across ${documents.length} document${documents.length !== 1 ? 's' : ''}`
            }
          />
        ) : loading ? (
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
            <div className="h-20 rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
            {answer && (
              <div className="rounded-xl border border-accent/20 dark:border-accent-dark/20 bg-accent-subtle dark:bg-accent-dark-subtle p-4">
                <p className="text-2xs font-semibold text-accent dark:text-accent-dark uppercase tracking-wider mb-2">
                  Answer
                </p>
                <p className="text-xs text-fg-secondary dark:text-fg-dark-secondary leading-relaxed whitespace-pre-wrap">
                  {answer}
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-fg-tertiary dark:text-fg-dark-tertiary uppercase tracking-wider mb-3">
                  Sources ({results.length})
                </p>
                <div className="space-y-2">
                  {results.map((src, i) => (
                    <div
                      key={`${src.chunk_id}-${i}`}
                      className="rounded-lg border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
                          <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                            {src.source}
                            {src.page_number != null ? ` · p.${src.page_number}` : ''}
                          </span>
                        </div>
                        {src.score != null && (
                          <span className="text-2xs text-accent dark:text-accent-dark font-medium">
                            {src.score.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fg-secondary dark:text-fg-dark-secondary leading-relaxed">
                        {src.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && answer && (
              <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary text-center">
                No source chunks found for this query.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
