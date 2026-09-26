import {
  Layers,
  Search,
  ArrowUpDown,
  LayoutGrid,
  MessageSquare,
  Clock,
  FileText,
  BarChart3,
} from 'lucide-react'
import { useChatStore } from '../../store/chat.store'
import type { ApiSourceChunk } from '../../types/api'
import type { RagTraceStep } from '../../types/chat'

const STEP_CONFIG: Record<
  string,
  { icon: typeof Search; label: string; description: string; color: string }
> = {
  retrieval: {
    icon: Search,
    label: 'Retrieval',
    description: 'Searching documents for relevant chunks',
    color: 'text-blue-500 dark:text-blue-400',
  },
  reranking: {
    icon: ArrowUpDown,
    label: 'Reranking',
    description: 'Reordering by relevance score',
    color: 'text-purple-500 dark:text-purple-400',
  },
  context: {
    icon: LayoutGrid,
    label: 'Context Assembly',
    description: 'Building prompt from top sources',
    color: 'text-amber-500 dark:text-amber-400',
  },
  generation: {
    icon: MessageSquare,
    label: 'Generation',
    description: 'Generating answer with LLM',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
}

function StepCard({ step, index }: { step: RagTraceStep; index: number }) {
  const config = STEP_CONFIG[step.step] || STEP_CONFIG.retrieval
  const Icon = config.icon

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5 dark:border-edge-dark dark:bg-surface-dark">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated">
          <Icon size={12} className={config.color} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-semibold text-fg-secondary dark:text-fg-dark-secondary">
              {config.label}
            </span>
            <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">
              Step {index + 1}
            </span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
          <Clock size={9} />
          {step.timing_ms.toFixed(0)}ms
        </span>
      </div>

      <p className="mb-2 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
        {config.description}
      </p>

      <div className="space-y-1.5">
        {step.chunks_found != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Chunks found</span>
            <span className="font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {step.chunks_found}
            </span>
          </div>
        )}
        {step.documents_searched != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Documents searched</span>
            <span className="font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {step.documents_searched}
            </span>
          </div>
        )}
        {step.chunks_after_rerank != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">After reranking</span>
            <span className="font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {step.chunks_after_rerank}
            </span>
          </div>
        )}
        {step.context_chars != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Context size</span>
            <span className="font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {step.context_chars.toLocaleString()} chars
            </span>
          </div>
        )}
        {step.sources_count != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Sources used</span>
            <span className="font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {step.sources_count}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source, index }: { source: ApiSourceChunk; index: number }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5 dark:border-edge-dark dark:bg-surface-dark">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10 text-2xs font-semibold text-accent dark:bg-accent-dark/10 dark:text-accent-dark">
            {index + 1}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <FileText size={11} className="shrink-0 text-fg-tertiary dark:text-fg-dark-tertiary" />
            <span className="truncate text-2xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {source.source}
            </span>
          </div>
        </div>
        {source.score != null && (
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-secondary dark:bg-surface-dark-elevated">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300 dark:bg-accent-dark"
                style={{ width: `${Math.min(source.score * 100, 100)}%` }}
              />
            </div>
            <span className="w-7 text-right text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
              {Math.round(source.score * 100)}%
            </span>
          </div>
        )}
      </div>
      {source.header && (
        <p className="mb-1.5 truncate text-2xs italic text-fg-tertiary dark:text-fg-dark-tertiary">
          {source.header}
        </p>
      )}
      <p className="line-clamp-3 text-[11px] leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
        {source.content}
      </p>
      {source.page_number != null && (
        <p className="mt-1.5 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
          Page {source.page_number}
        </p>
      )}
    </div>
  )
}

export function RagTracePanel() {
  const sessions = useChatStore((s) => s.sessions)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const messages = sessions.find((session) => session.id === activeSessionId)?.messages ?? []
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  if (!lastAssistant) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated">
          <Layers size={20} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
        </div>
        <p className="mb-1 text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
          RAG Trace
        </p>
        <p className="max-w-[200px] text-2xs leading-relaxed text-fg-tertiary dark:text-fg-dark-tertiary">
          Send a message to see the retrieval pipeline and sources
        </p>
      </div>
    )
  }

  const trace = lastAssistant.trace
  const sources = lastAssistant.sources || []

  return (
    <div className="space-y-6 p-4">
      {/* Pipeline */}
      {trace && trace.steps.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
            <h4 className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
              Pipeline
            </h4>
          </div>
          <div className="space-y-2.5">
            {trace.steps.map((step, i) => (
              <StepCard key={`${step.step}-${i}`} step={step} index={i} />
            ))}
          </div>
          {trace.total_time_ms != null && (
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                Total time
              </span>
              <span className="text-2xs font-semibold text-fg-secondary dark:text-fg-dark-secondary">
                {trace.total_time_ms.toFixed(0)}ms
              </span>
            </div>
          )}
        </section>
      )}

      {/* Sources */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
          <h4 className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
            Sources · {sources.length}
          </h4>
        </div>
        {sources.length === 0 ? (
          <p className="text-2xs italic text-fg-tertiary dark:text-fg-dark-tertiary">
            No sources retrieved
          </p>
        ) : (
          <div className="space-y-2.5">
            {sources.map((src, i) => (
              <SourceCard key={`${src.chunk_id}-${i}`} source={src} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
