import { useState, useRef } from 'react'
import { Search as SearchIcon, Send, FileText } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { queryDocuments } from '../services/query.service'
import { toast } from 'sonner'
import type { ChatSource } from '../types/chat'

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
      {/* Header */}
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Semantic search across all documents..."
            className="w-full pl-9 pr-10 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!searched ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
              <SearchIcon size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {documents.length === 0 ? 'No documents to search' : 'Search across all documents'}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {documents.length === 0
                ? 'Upload documents first to enable search'
                : `Searching across ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        ) : loading ? (
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
            <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
            {/* Answer */}
            {answer && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  Answer
                </p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {answer}
                </p>
              </div>
            )}

            {/* Sources */}
            {results.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                  Sources ({results.length})
                </p>
                <div className="space-y-2">
                  {results.map((src, i) => (
                    <div
                      key={`${src.chunk_id}-${i}`}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-zinc-400" />
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {src.source}
                            {src.page_number != null ? ` · p.${src.page_number}` : ''}
                          </span>
                        </div>
                        {src.score != null && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {src.score.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {src.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && answer && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
                No source chunks found for this query.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
