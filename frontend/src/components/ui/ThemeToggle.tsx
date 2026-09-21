import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Tooltip } from './Tooltip'

export type ThemeMode = 'light' | 'dark' | 'system'

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('docuchat-theme') as ThemeMode) || 'system'
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
}

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)

  useEffect(() => {
    applyTheme(resolveDark(mode))

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [mode])

  const cycle = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
    setMode(next)
    localStorage.setItem('docuchat-theme', next)
  }

  const icon = mode === 'system' ? (
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
      aria-label={MODE_LABELS[mode]}
      className={cn(
        'flex items-center justify-center rounded-md transition-colors',
        'text-fg-tertiary hover:text-fg hover:bg-surface-secondary',
        'dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated',
        collapsed ? 'w-8 h-8' : 'w-full h-8 px-2.5 gap-2 justify-start',
      )}
    >
      {icon}
      {!collapsed && (
        <span className="text-xs capitalize">{mode}</span>
      )}
    </button>
  )

  if (collapsed) {
    return <Tooltip content={MODE_LABELS[mode]} side="right">{button}</Tooltip>
  }

  return button
}
