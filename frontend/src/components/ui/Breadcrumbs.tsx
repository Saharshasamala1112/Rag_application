import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-2xs', className)} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={10} className="text-fg-muted dark:text-fg-dark-tertiary" />}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-fg-tertiary dark:text-fg-dark-tertiary hover:text-fg-secondary dark:hover:text-fg-dark-secondary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-fg-secondary dark:text-fg-dark-secondary font-medium' : 'text-fg-tertiary dark:text-fg-dark-tertiary'}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
