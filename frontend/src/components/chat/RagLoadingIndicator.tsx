import { Search, ArrowUpDown, LayoutGrid, MessageSquare, Check } from 'lucide-react'

interface RagLoadingIndicatorProps {
  status: string | null
  traceSteps: string[]
}

const STAGE_MAP: Record<string, { icon: typeof Search; label: string }> = {
  'retrieval': { icon: Search, label: 'Searching knowledge base' },
  'reranking': { icon: ArrowUpDown, label: 'Ranking relevant sources' },
  'context': { icon: LayoutGrid, label: 'Assembling context' },
  'generation': { icon: MessageSquare, label: 'Generating answer' },
}

const STATUS_TO_STAGE: Record<string, string> = {
  'Preparing...': 'retrieval',
  'Searching documents...': 'retrieval',
  'Searching...': 'retrieval',
  'Reranking...': 'reranking',
  'Ranking sources...': 'reranking',
  'Building context...': 'context',
  'Assembling context...': 'context',
  'Generating...': 'generation',
  'Generating answer...': 'generation',
  'Thinking...': 'generation',
}

export function RagLoadingIndicator({ status, traceSteps }: RagLoadingIndicatorProps) {
  // Determine current stage from status
  const currentStage = status ? (STATUS_TO_STAGE[status] || 'retrieval') : 'retrieval'

  const stages = ['retrieval', 'reranking', 'context', 'generation'] as const

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
                          ? 'text-accent dark:text-accent-dark animate-pulse'
                          : 'text-fg-muted dark:text-fg-dark-tertiary'
                      }
                    />
                  )}
                </div>
                <span
                  className={`text-2xs transition-colors duration-200 ${
                    isActive
                      ? 'text-fg-secondary dark:text-fg-dark-secondary font-medium'
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
                  className={`w-6 h-px transition-colors duration-200 ${
                    isCompleted ? 'bg-success/30 dark:bg-success-dark/30' : 'bg-edge dark:bg-edge-dark'
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
