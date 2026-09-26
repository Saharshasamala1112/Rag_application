import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSystemPrefersDark } from '../test/media-query'
import indexHtml from '../../index.html?raw'

const inlineScript = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? ''

/** Runs the real first-paint script that ships in index.html. */
// eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
const runBootScript = (code: string): unknown => new Function(code)()

async function loadThemeModule() {
  vi.resetModules()
  return await import('../store/theme.store')
}

describe('theme store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSystemPrefersDark(false)
    document.documentElement.classList.remove('dark')
  })

  it('defaults to system mode and applies the OS preference', async () => {
    setSystemPrefersDark(true)
    const { useThemeStore } = await loadThemeModule()

    expect(useThemeStore.getState().mode).toBe('system')
    expect(useThemeStore.getState().isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it("treats a stored 'system' value as system, not light", async () => {
    window.localStorage.setItem('docuchat-theme', 'system')
    setSystemPrefersDark(true)
    const { useThemeStore } = await loadThemeModule()

    expect(useThemeStore.getState().mode).toBe('system')
    expect(useThemeStore.getState().isDark).toBe(true)
  })

  it('keeps an explicit light preference light even when the OS is dark', async () => {
    window.localStorage.setItem('docuchat-theme', 'light')
    setSystemPrefersDark(true)
    const { useThemeStore } = await loadThemeModule()

    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists every step of the light → dark → system cycle', async () => {
    const { useThemeStore } = await loadThemeModule()
    useThemeStore.getState().setMode('light')

    useThemeStore.getState().cycle()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(window.localStorage.getItem('docuchat-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    useThemeStore.getState().cycle()
    expect(useThemeStore.getState().mode).toBe('system')
    expect(window.localStorage.getItem('docuchat-theme')).toBe('system')

    useThemeStore.getState().cycle()
    expect(useThemeStore.getState().mode).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('follows OS preference changes while in system mode', async () => {
    const { useThemeStore } = await loadThemeModule()
    expect(useThemeStore.getState().mode).toBe('system')

    setSystemPrefersDark(true)
    expect(useThemeStore.getState().isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    setSystemPrefersDark(false)
    expect(useThemeStore.getState().isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('first-paint theme script in index.html', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSystemPrefersDark(false)
    document.documentElement.classList.remove('dark')
  })

  it("resolves a saved 'system' preference from the OS instead of forcing light", () => {
    expect(inlineScript).toContain('prefers-color-scheme: dark')

    setSystemPrefersDark(true)
    document.documentElement.classList.remove('dark')
    window.localStorage.setItem('docuchat-theme', 'system')

    runBootScript(inlineScript)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('honours an explicit light preference even when the OS is dark', () => {
    setSystemPrefersDark(true)
    document.documentElement.classList.remove('dark')
    window.localStorage.setItem('docuchat-theme', 'light')

    runBootScript(inlineScript)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
