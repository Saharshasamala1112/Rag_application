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
        'flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-default',
        collapsed && 'justify-center px-0',
      )}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 dark:bg-accent-dark/10 text-accent dark:text-accent-dark">
        <User size={13} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg dark:text-fg-dark truncate">Local User</p>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary truncate">No auth configured</p>
        </div>
      )}
    </div>
  )

  if (collapsed) {
    return <Tooltip content="Local User" side="right">{content}</Tooltip>
  }

  return content
}
