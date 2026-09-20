import { FileText, MessageSquare } from 'lucide-react'
import { useDocumentStore } from '../../store/document.store'

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

const QUICK_PROMPTS = [
  'Summarize this document',
  'What are the key findings?',
  'Explain the main concepts',
  'List all important definitions',
  'What conclusions are drawn?',
  'Compare different viewpoints',
]

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const documents = useDocumentStore((s) => s.documents)
  const hasDocs = documents.length > 0

  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-4 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5">
        <MessageSquare size={22} className="text-zinc-400 dark:text-zinc-500" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
        How can I help you today?
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        {hasDocs
          ? `Ask questions about your ${documents.length} document${documents.length !== 1 ? 's' : ''}`
          : 'Upload documents to start asking questions'}
      </p>

      {hasDocs ? (
        <div className="grid grid-cols-2 gap-2 w-full">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="text-left rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/60 px-3.5 py-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-[0.98] transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
            <FileText size={28} className="text-zinc-300 dark:text-zinc-600" />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more
          </p>
        </div>
      )}
    </div>
  )
}
