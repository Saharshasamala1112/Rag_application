import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useThemeStore } from '../store/theme.store'
import { setSystemPrefersDark } from '../test/media-query'

afterEach(cleanup)

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSystemPrefersDark(false)
    useThemeStore.getState().setMode('system')
    document.documentElement.classList.remove('dark')
  })

  it('shares one mode between every toggle instance', () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    )

    expect(screen.getAllByRole('button', { name: 'System theme' })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button')[0])

    expect(screen.getAllByRole('button', { name: 'Light mode' })).toHaveLength(2)
    expect(window.localStorage.getItem('docuchat-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('labels the collapsed sidebar toggle with the current mode', () => {
    render(<ThemeToggle collapsed />)

    expect(screen.getByRole('button', { name: 'System theme' })).toBeInTheDocument()
  })
})
