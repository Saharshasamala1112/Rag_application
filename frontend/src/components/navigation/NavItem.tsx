import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  collapsed?: boolean
  exact?: boolean
  /** Fired on activation, e.g. to dismiss the mobile navigation drawer. */
  onClick?: () => void
}

export function NavItem({ to, icon: Icon, label, collapsed, exact, onClick }: NavItemProps) {
  const location = useLocation()
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/')

  const content = (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-surface-secondary text-fg dark:bg-surface-dark-elevated dark:text-fg-dark'
          : 'text-fg-secondary hover:bg-surface-secondary/60 hover:text-fg dark:text-fg-dark-secondary dark:hover:bg-surface-dark-elevated/60 dark:hover:text-fg-dark',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
      aria-label={label}
    >
      <Icon
        size={15}
        className={cn(
          'shrink-0 transition-colors',
          isActive
            ? 'text-accent dark:text-accent-dark'
            : 'text-fg-tertiary group-hover:text-fg-secondary dark:text-fg-dark-tertiary dark:group-hover:text-fg-dark-secondary',
        )}
      />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        {content}
      </Tooltip>
    )
  }

  return content
}
