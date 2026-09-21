import { FileText, Search, BookOpen, GitCompare, Lightbulb, FileSearch } from 'lucide-react'
import { useDocumentStore } from '../../store/document.store'

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

const SUGGESTIONS = [
  {
    icon: BookOpen,
    label: 'Summarize a document',
    prompt: 'Provide a concise summary of the key points in this document.',
  },
  {
    icon: GitCompare,
    label: 'Compare documents',
    prompt: 'Compare the findings and conclusions across these documents. What are the key differences and similarities?',
  },
  {
    icon: FileSearch,
    label: 'Find supporting evidence',
    prompt: 'Find evidence and references that support the main arguments in these documents.',
  },
  {
    icon: Lightbulb,
    label: 'Explain a topic',
    prompt: 'Explain the main concepts and methodologies described in these documents in simple terms.',
  },
]

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const hasDocs = documents.length > 0
  const activeDoc = documents.find((d) => d.document_id === activeDocumentId)

  const heading = activeDoc
    ? `Ask about "${activeDoc.filename}"`
    : 'Ask your knowledge base'
  const subtext = activeDoc
    ? 'This document is selected — ask anything about it.'
    : hasDocs
      ? `Search across your ${documents.length} document${documents.length !== 1 ? 's' : ''}, reports, research papers and datasets.`
      : 'Upload documents to start asking questions.'

  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-6 max-w-xl mx-auto select-none">
      {/* Hero icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark">
        <Search size={26} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
      </div>

      {/* Heading */}
      <h2 className="text-xl font-semibold text-fg dark:text-fg-dark mb-2 tracking-tight">
        {heading}
      </h2>
      <p className="text-sm text-fg-secondary dark:text-fg-dark-secondary leading-relaxed mb-8 max-w-md">
        {subtext}
      </p>

      {/* Suggestions */}
      {hasDocs ? (
        <div className="w-full max-w-md space-y-2">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onSelectPrompt(s.prompt)}
                className="group w-full flex items-center gap-3 rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark px-4 py-3.5 text-left hover:border-edge-strong dark:hover:border-edge-dark-strong hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated active:scale-[0.985] transition-all duration-150"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated group-hover:bg-accent/10 dark:group-hover:bg-accent-dark/10 transition-colors">
                  <Icon size={15} className="text-fg-tertiary dark:text-fg-dark-tertiary group-hover:text-accent dark:group-hover:text-accent-dark transition-colors" />
                </div>
                <span className="text-sm text-fg-secondary dark:text-fg-dark-secondary group-hover:text-fg dark:group-hover:text-fg-dark transition-colors">
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 mt-2">
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
