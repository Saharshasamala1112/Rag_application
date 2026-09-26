import { User } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { cn } from '../../lib/utils'

interface UserMenuProps {
  collapsed?: boolean
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const content = (
    <div
      className={cn(
        'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2',
        collapsed && 'justify-center px-0',
      )}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark">
        <User size={13} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg dark:text-fg-dark">Local User</p>
          <p className="truncate text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            No auth configured
          </p>
        </div>
      )}
    </div>
  )

  if (collapsed) {
    return (
      <Tooltip content="Local User" side="right">
        {content}
      </Tooltip>
    )
  }

  return content
}
