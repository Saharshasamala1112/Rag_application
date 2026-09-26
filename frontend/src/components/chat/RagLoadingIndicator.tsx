import { Search, ArrowUpDown, LayoutGrid, MessageSquare, Check } from 'lucide-react'
import { QUERY_STREAM_STATUS_TO_STAGE, QUERY_STREAM_TRACE_STEPS } from '../../contracts/queryStream'

interface RagLoadingIndicatorProps {
  status: string | null
  traceSteps: string[]
}

const STAGE_MAP: Record<string, { icon: typeof Search; label: string }> = {
  retrieval: { icon: Search, label: 'Searching knowledge base' },
  reranking: { icon: ArrowUpDown, label: 'Ranking relevant sources' },
  context: { icon: LayoutGrid, label: 'Assembling context' },
  generation: { icon: MessageSquare, label: 'Generating answer' },
}

export function RagLoadingIndicator({ status, traceSteps }: RagLoadingIndicatorProps) {
  const currentStage = status ? QUERY_STREAM_STATUS_TO_STAGE[status] : QUERY_STREAM_TRACE_STEPS[0]
  if (status && !currentStage) {
    console.warn(`Unknown RAG status: ${status}`)
  }

  const stages = QUERY_STREAM_TRACE_STEPS

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-3">
        {stages.map((stageKey, idx) => {
          const stage = STAGE_MAP[stageKey]
          const Icon = stage.icon
          const isActive = stageKey === currentStage
          const isCompleted = traceSteps.includes(stageKey)

          return (
            <div key={stageKey} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-200 ${
                    isCompleted
                      ? 'bg-success/15 dark:bg-success-dark/15'
                      : isActive
                        ? 'bg-accent/15 dark:bg-accent-dark/15'
                        : 'bg-surface-secondary dark:bg-surface-dark-elevated'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={10} className="text-success dark:text-success-dark" />
                  ) : (
                    <Icon
                      size={10}
                      className={
                        isActive
                          ? 'animate-pulse text-accent dark:text-accent-dark'
                          : 'text-fg-muted dark:text-fg-dark-tertiary'
                      }
                    />
                  )}
                </div>
                <span
                  aria-current={stageKey === currentStage ? 'step' : undefined}
                  className={`text-2xs transition-colors duration-200 ${
                    isActive
                      ? 'font-medium text-fg-secondary dark:text-fg-dark-secondary'
                      : isCompleted
                        ? 'text-fg-tertiary dark:text-fg-dark-tertiary'
                        : 'text-fg-muted dark:text-fg-dark-tertiary'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={`h-px w-6 transition-colors duration-200 ${
                    isCompleted
                      ? 'bg-success/30 dark:bg-success-dark/30'
                      : 'bg-edge dark:bg-edge-dark'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
