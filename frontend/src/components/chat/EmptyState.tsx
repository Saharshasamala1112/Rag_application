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
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const hasDocs = documents.length > 0
  const activeDoc = documents.find((d) => d.document_id === activeDocumentId)

  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-4 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated flex items-center justify-center mb-5">
        <MessageSquare size={22} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
      </div>
      <h2 className="text-lg font-semibold text-fg dark:text-fg-dark mb-1.5">
        {activeDoc ? `Ask about "${activeDoc.filename}"` : 'How can I help you today?'}
      </h2>
      <p className="text-sm text-fg-secondary dark:text-fg-dark-secondary mb-6">
        {activeDoc
          ? `This document is selected — ask anything about it`
          : hasDocs
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
              className="text-left rounded-lg border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark px-3.5 py-2.5 text-xs text-fg-secondary dark:text-fg-dark-secondary hover:border-edge-strong dark:hover:border-edge-dark-strong hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated hover:text-fg dark:hover:text-fg-dark active:scale-[0.98] transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-edge-strong dark:border-edge-dark-strong flex items-center justify-center">
            <FileText size={28} className="text-fg-muted dark:text-fg-dark-tertiary" />
          </div>
          <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
            PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more
          </p>
        </div>
      )}
    </div>
  )
}
