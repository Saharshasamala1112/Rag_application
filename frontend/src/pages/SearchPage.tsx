import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'

export function SearchPage() {
  const documents = useDocumentStore((s) => s.documents)
  const [query, setQuery] = useState('')

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center">
        <div className="relative w-full max-w-xl">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search across all documents..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
            <SearchIcon size={24} className="text-zinc-300 dark:text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            {documents.length === 0 ? 'No documents to search' : 'Type a query to search'}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {documents.length === 0
              ? 'Upload documents first to enable search'
              : `Searching across ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>
  )
}
