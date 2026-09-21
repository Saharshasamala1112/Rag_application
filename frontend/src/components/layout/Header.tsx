import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function Header({ title, subtitle, actions, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between h-12 px-4 border-b border-edge dark:border-edge-dark shrink-0',
        'bg-surface dark:bg-surface-dark',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-fg dark:text-fg-dark truncate">{title}</h1>
            {subtitle && (
              <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </header>
  )
}
