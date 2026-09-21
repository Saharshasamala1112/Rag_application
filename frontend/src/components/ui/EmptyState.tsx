import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated text-fg-tertiary dark:text-fg-dark-tertiary mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-fg dark:text-fg-dark">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-fg-secondary dark:text-fg-dark-secondary text-center max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
