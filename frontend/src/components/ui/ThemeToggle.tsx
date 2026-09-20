import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

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

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
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
    <Monitor size={15} />
  ) : mode === 'dark' ? (
    <Sun size={15} />
  ) : (
    <Moon size={15} />
  )

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={cycle}
        aria-label={`Theme: ${mode}. Click to cycle.`}
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title={`Theme: ${mode}`}
      >
        {icon}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${mode}. Click to cycle.`}
      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      title={`Theme: ${mode}`}
    >
      {icon}
      <span className="capitalize">{mode}</span>
    </button>
  )
}
