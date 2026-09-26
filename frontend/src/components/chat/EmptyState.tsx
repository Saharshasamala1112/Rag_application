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
    prompt:
      'Compare the findings and conclusions across these documents. What are the key differences and similarities?',
  },
  {
    icon: FileSearch,
    label: 'Find supporting evidence',
    prompt: 'Find evidence and references that support the main arguments in these documents.',
  },
  {
    icon: Lightbulb,
    label: 'Explain a topic',
    prompt:
      'Explain the main concepts and methodologies described in these documents in simple terms.',
  },
]

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const hasDocs = documents.length > 0
  const activeDoc = documents.find((d) => d.document_id === activeDocumentId)

  const heading = activeDoc ? `Ask about "${activeDoc.filename}"` : 'Ask your knowledge base'
  const subtext = activeDoc
    ? 'This document is selected — ask anything about it.'
    : hasDocs
      ? `Search across your ${documents.length} document${documents.length !== 1 ? 's' : ''}, reports, research papers and datasets.`
      : 'Upload documents to start asking questions.'

  return (
    <div className="mx-auto flex h-full max-w-xl select-none flex-col items-center justify-center px-6 text-center">
      {/* Hero icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-edge bg-surface dark:border-edge-dark dark:bg-surface-dark">
        <Search size={26} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-fg dark:text-fg-dark">
        {heading}
      </h2>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
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
                className="group flex w-full items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3.5 text-left transition-all duration-150 hover:border-edge-strong hover:bg-surface-secondary active:scale-[0.985] dark:border-edge-dark dark:bg-surface-dark dark:hover:border-edge-dark-strong dark:hover:bg-surface-dark-elevated"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary transition-colors group-hover:bg-accent/10 dark:bg-surface-dark-elevated dark:group-hover:bg-accent-dark/10">
                  <Icon
                    size={15}
                    className="text-fg-tertiary transition-colors group-hover:text-accent dark:text-fg-dark-tertiary dark:group-hover:text-accent-dark"
                  />
                </div>
                <span className="text-sm text-fg-secondary transition-colors group-hover:text-fg dark:text-fg-dark-secondary dark:group-hover:text-fg-dark">
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-edge-strong dark:border-edge-dark-strong">
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
