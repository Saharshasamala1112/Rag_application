import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'docuchat-theme'

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

/** Cycle order used by the theme toggle button. */
export const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
}

export function themeModeLabel(mode: ThemeMode): string {
  return MODE_LABELS[mode]
}

type ThemeState = {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  cycle: () => void
}

/** Whether the OS reports a dark color scheme. */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

/** `'system'` resolves against the OS preference; anything else is explicit. */
export function resolveIsDark(mode: ThemeMode, systemDark = systemPrefersDark()): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemDark
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function applyDarkClass(isDark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredMode(),
  isDark: resolveIsDark(readStoredMode()),
  setMode: (mode) => {
    const isDark = resolveIsDark(mode)
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyDarkClass(isDark)
    set({ mode, isDark })
  },
  cycle: () => get().setMode(THEME_CYCLE[get().mode]),
}))

/** Re-applies the class when the OS preference changes in `'system'` mode. */
function syncSystemTheme(): void {
  const { mode } = useThemeStore.getState()
  if (mode !== 'system') return
  const isDark = systemPrefersDark()
  applyDarkClass(isDark)
  useThemeStore.setState({ isDark })
}

applyDarkClass(useThemeStore.getState().isDark)

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia(SYSTEM_DARK_QUERY).addEventListener('change', syncSystemTheme)
}
