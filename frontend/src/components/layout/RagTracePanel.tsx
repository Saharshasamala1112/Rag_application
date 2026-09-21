import { Layers, Search, ArrowUpDown, LayoutGrid, MessageSquare, Clock } from 'lucide-react'
import { useChatStore } from '../../store/chat.store'
import type { RagTraceStep } from '../../types/chat'

const STEP_CONFIG: Record<string, { icon: typeof Search; label: string; color: string }> = {
  retrieval: { icon: Search, label: 'Retrieval', color: 'text-blue-500 dark:text-blue-400' },
  reranking: { icon: ArrowUpDown, label: 'Reranking', color: 'text-purple-500 dark:text-purple-400' },
  context: { icon: LayoutGrid, label: 'Context Assembly', color: 'text-amber-500 dark:text-amber-400' },
  generation: { icon: MessageSquare, label: 'Generation', color: 'text-emerald-500 dark:text-emerald-400' },
}

function StepCard({ step }: { step: RagTraceStep }) {
  const config = STEP_CONFIG[step.step] || STEP_CONFIG.retrieval
  const Icon = config.icon

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-700">
          <Icon size={11} className={config.color} />
        </div>
        <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
          {config.label}
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          <Clock size={9} />
          {step.timing_ms.toFixed(0)}ms
        </span>
      </div>
      <div className="space-y-1">
        {step.chunks_found != null && (
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-400 dark:text-zinc-500">Chunks found</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{step.chunks_found}</span>
          </div>
        )}
        {step.documents_searched != null && (
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-400 dark:text-zinc-500">Documents</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{step.documents_searched}</span>
          </div>
        )}
        {step.chunks_after_rerank != null && (
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-400 dark:text-zinc-500">After rerank</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{step.chunks_after_rerank}</span>
          </div>
        )}
        {step.context_chars != null && (
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-400 dark:text-zinc-500">Context size</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{step.context_chars.toLocaleString()} chars</span>
          </div>
        )}
        {step.sources_count != null && (
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-400 dark:text-zinc-500">Sources used</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{step.sources_count}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function RagTracePanel() {
  const messages = useChatStore((s) => s.messages)
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  if (!lastAssistant) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Layers size={18} className="text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Send a message to see the RAG retrieval trace
        </p>
      </div>
    )
  }

  const trace = lastAssistant.trace
  const sources = lastAssistant.sources || []

  return (
    <div className="p-4 space-y-5">
      {/* Trace steps */}
      {trace && trace.steps.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Pipeline
          </h4>
          <div className="space-y-2">
            {trace.steps.map((step, i) => (
              <StepCard key={`${step.step}-${i}`} step={step} index={i} />
            ))}
          </div>
          {trace.total_time_ms != null && (
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Total</span>
              <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                {trace.total_time_ms.toFixed(0)}ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Sources ({sources.length})
        </h4>
        {sources.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No sources retrieved</p>
        ) : (
          <div className="space-y-2">
            {sources.map((src, i) => (
              <div
                key={`${src.chunk_id}-${i}`}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    #{i + 1}
                  </span>
                  {src.score != null && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(src.score, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400">{src.score.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                  {src.content}
                </p>
                {src.source && (
                  <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                    {src.source}
                    {src.page_number != null ? ` · p.${src.page_number}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
