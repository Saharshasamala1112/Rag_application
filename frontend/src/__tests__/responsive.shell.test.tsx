import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppShell, type AppShellContext } from '../app/AppShell'
import { setViewportWidth } from '../test/media-query'
import type { ChatSource } from '../types/chat'

const NAV = { name: 'Main navigation' }

const SOURCE: ChatSource = {
  chunk_id: 1,
  source: 'handbook.pdf',
  content: 'A quoted passage from the handbook.',
  score: 0.92,
  page_number: 3,
}

function ShellProbe() {
  const { toggleContextPanel, selectSource } = useOutletContext<AppShellContext>()
  return (
    <div>
      <button type="button" onClick={toggleContextPanel}>
        Toggle context panel
      </button>
      <button type="button" onClick={() => selectSource(SOURCE)}>
        Open source
      </button>
    </div>
  )
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<ShellProbe />} />
          <Route path="*" element={<ShellProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe.each([360, 768])('sidebar below lg at %ipx', (width) => {
  beforeEach(() => setViewportWidth(width))

  it('keeps navigation out of reach until the header menu opens the drawer', () => {
    renderShell()

    expect(screen.queryByRole('navigation', NAV)).toBeNull()

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'app-sidebar')

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', NAV)).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('sidebar-backdrop'))

    expect(screen.queryByRole('navigation', NAV)).toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the drawer on Escape', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('navigation', NAV)).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('navigation', NAV)).toBeNull()
  })

  it('closes the drawer after navigating', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    fireEvent.click(screen.getByRole('link', { name: 'Documents' }))

    expect(screen.queryByRole('navigation', NAV)).toBeNull()
  })
})

describe('sidebar at lg and wider', () => {
  beforeEach(() => setViewportWidth(1280))

  it('renders the persistent sidebar instead of a drawer', () => {
    renderShell()

    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(screen.getByRole('navigation', NAV)).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-backdrop')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' }),
    ).toBeInTheDocument()
  })
})

describe('context panel', () => {
  it('opens as a sheet with an overlay below lg', () => {
    setViewportWidth(360)
    renderShell()

    expect(screen.queryByTestId('context-panel-backdrop')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle context panel' }))

    expect(screen.getByTestId('context-panel-backdrop')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('context-panel-backdrop'))

    expect(screen.queryByRole('button', { name: 'Close panel' })).toBeNull()
    expect(screen.queryByTestId('context-panel-backdrop')).toBeNull()
  })

  it('renders inline without an overlay at lg and wider', () => {
    setViewportWidth(1280)
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Open source' }))

    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument()
    expect(screen.queryByTestId('context-panel-backdrop')).toBeNull()
    expect(screen.getByText('handbook.pdf · p.3')).toBeInTheDocument()
  })
})
