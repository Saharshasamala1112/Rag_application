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
    <div className={cn('flex flex-col items-center justify-center px-4 py-16', className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary text-fg-tertiary dark:bg-surface-dark-elevated dark:text-fg-dark-tertiary">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-fg dark:text-fg-dark">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-center text-xs text-fg-secondary dark:text-fg-dark-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
