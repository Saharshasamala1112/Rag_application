import { Layers, Search, ArrowUpDown, LayoutGrid, MessageSquare, Clock, FileText, BarChart3 } from 'lucide-react'
import { useChatStore } from '../../store/chat.store'
import type { RagTraceStep } from '../../types/chat'

const STEP_CONFIG: Record<string, { icon: typeof Search; label: string; description: string; color: string }> = {
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
    <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-3.5">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-surface-secondary dark:bg-surface-dark-elevated">
          <Icon size={12} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-semibold text-fg-secondary dark:text-fg-dark-secondary">
              {config.label}
            </span>
            <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary">
              Step {index + 1}
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary shrink-0">
          <Clock size={9} />
          {step.timing_ms.toFixed(0)}ms
        </span>
      </div>

      <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mb-2">
        {config.description}
      </p>

      <div className="space-y-1.5">
        {step.chunks_found != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Chunks found</span>
            <span className="text-fg-secondary dark:text-fg-dark-secondary font-medium">{step.chunks_found}</span>
          </div>
        )}
        {step.documents_searched != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Documents searched</span>
            <span className="text-fg-secondary dark:text-fg-dark-secondary font-medium">{step.documents_searched}</span>
          </div>
        )}
        {step.chunks_after_rerank != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">After reranking</span>
            <span className="text-fg-secondary dark:text-fg-dark-secondary font-medium">{step.chunks_after_rerank}</span>
          </div>
        )}
        {step.context_chars != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Context size</span>
            <span className="text-fg-secondary dark:text-fg-dark-secondary font-medium">{step.context_chars.toLocaleString()} chars</span>
          </div>
        )}
        {step.sources_count != null && (
          <div className="flex justify-between text-2xs">
            <span className="text-fg-tertiary dark:text-fg-dark-tertiary">Sources used</span>
            <span className="text-fg-secondary dark:text-fg-dark-secondary font-medium">{step.sources_count}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source, index }: { source: { source: string; content: string; score: number; page_number: number | null; header: string | null }; index: number }) {
  return (
    <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10 dark:bg-accent-dark/10 text-2xs font-semibold text-accent dark:text-accent-dark">
            {index + 1}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText size={11} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
            <span className="text-2xs font-medium text-fg-secondary dark:text-fg-dark-secondary truncate">
              {source.source}
            </span>
          </div>
        </div>
        {source.score != null && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-14 h-1.5 rounded-full bg-surface-secondary dark:bg-surface-dark-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-accent dark:bg-accent-dark transition-all duration-300"
                style={{ width: `${Math.min(source.score * 100, 100)}%` }}
              />
            </div>
            <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary w-7 text-right">
              {Math.round(source.score * 100)}%
            </span>
          </div>
        )}
      </div>
      {source.header && (
        <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mb-1.5 italic truncate">
          {source.header}
        </p>
      )}
      <p className="text-[11px] text-fg-secondary dark:text-fg-dark-secondary leading-relaxed line-clamp-3">
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
  const messages = useChatStore((s) => s.messages)
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  if (!lastAssistant) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated">
          <Layers size={20} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
        </div>
        <p className="text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">
          RAG Trace
        </p>
        <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary max-w-[200px] leading-relaxed">
          Send a message to see the retrieval pipeline and sources
        </p>
      </div>
    )
  }

  const trace = lastAssistant.trace
  const sources = lastAssistant.sources || []

  return (
    <div className="p-4 space-y-6">
      {/* Pipeline */}
      {trace && trace.steps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
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
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">Total time</span>
              <span className="text-2xs font-semibold text-fg-secondary dark:text-fg-dark-secondary">
                {trace.total_time_ms.toFixed(0)}ms
              </span>
            </div>
          )}
        </section>
      )}

      {/* Sources */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
          <h4 className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary dark:text-fg-dark-tertiary">
            Sources · {sources.length}
          </h4>
        </div>
        {sources.length === 0 ? (
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary italic">
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
