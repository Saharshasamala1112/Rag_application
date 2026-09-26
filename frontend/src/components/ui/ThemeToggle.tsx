import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Tooltip } from './Tooltip'
import { themeModeLabel, useThemeStore } from '../../store/theme.store'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const mode = useThemeStore((state) => state.mode)
  const cycle = useThemeStore((state) => state.cycle)

  const icon =
    mode === 'system' ? (
      <Monitor size={14} />
    ) : mode === 'dark' ? (
      <Sun size={14} />
    ) : (
      <Moon size={14} />
    )

  const button = (
    <button
      type="button"
      onClick={cycle}
      aria-label={themeModeLabel(mode)}
      className={cn(
        'flex items-center justify-center rounded-md transition-colors',
        'text-fg-tertiary hover:bg-surface-secondary hover:text-fg',
        'dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark',
        collapsed ? 'h-8 w-8' : 'h-8 w-full justify-start gap-2 px-2.5',
      )}
    >
      {icon}
      {!collapsed && <span className="text-xs capitalize">{mode}</span>}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip content={themeModeLabel(mode)} side="right">
        {button}
      </Tooltip>
    )
  }

  return button
}
