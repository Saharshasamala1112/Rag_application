import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'accent' | 'danger' | 'success' | 'warning' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-surface-secondary text-fg-secondary border border-edge dark:bg-surface-dark-elevated dark:text-fg-dark-secondary dark:border-edge-dark',
  accent:
    'bg-accent/10 text-accent border border-accent/20 dark:bg-accent-dark/10 dark:text-accent-dark dark:border-accent-dark/20',
  danger:
    'bg-danger-subtle text-danger border border-danger/20 dark:bg-danger-dark-subtle dark:text-danger-dark dark:border-danger-dark/20',
  success:
    'bg-success-subtle text-success border border-success/20 dark:bg-success-dark-subtle dark:text-success-dark dark:border-success-dark/20',
  warning:
    'bg-warning-subtle text-warning border border-warning/20 dark:bg-warning-dark-subtle dark:text-warning-dark dark:border-warning-dark/20',
  muted: 'bg-transparent text-fg-tertiary border border-transparent dark:text-fg-dark-tertiary',
}

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'accent' && 'bg-accent dark:bg-accent-dark',
            variant === 'danger' && 'bg-danger dark:bg-danger-dark',
            variant === 'success' && 'bg-success dark:bg-success-dark',
            variant === 'warning' && 'bg-warning dark:bg-warning-dark',
            variant === 'default' && 'bg-fg-tertiary dark:bg-fg-dark-tertiary',
            variant === 'muted' && 'bg-fg-muted dark:bg-fg-dark-tertiary',
          )}
        />
      )}
      {children}
    </span>
  )
}
