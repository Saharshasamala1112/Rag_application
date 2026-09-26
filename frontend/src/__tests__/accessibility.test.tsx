import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatComposer } from '../components/chat/ChatComposer'
import { DocumentScopeBadge } from '../components/chat/DocumentScopeBadge'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { Dropdown } from '../components/ui/Dropdown'
import { Modal } from '../components/ui/Modal'
import { CollectionsPage } from '../pages/CollectionsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { useChatStore } from '../store/chat.store'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import * as conversationService from '../services/conversation.service'

vi.mock('../services/collection.service', () => ({
  listCollections: vi.fn().mockResolvedValue({ collections: [] }),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}))

vi.mock('../services/conversation.service', () => ({
  listConversations: vi.fn().mockResolvedValue({ conversations: [], total: 0 }),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
}))

afterEach(cleanup)

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectAccessible(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results.violations.map((violation) => violation.id)).toEqual([])
}

describe('core-screen accessibility', () => {
  it('keeps chat controls and messages accessible', async () => {
    const onClear = vi.fn()
    const { container } = render(
      <>
        <DocumentScopeBadge documentName="Focused document.pdf" onClear={onClear} />
        <DocumentScopeBadge documentName={null} onClear={onClear} />
        <MessageBubble
          message={{
            id: 'assistant-1',
            role: 'assistant',
            content: 'A grounded answer.',
            createdAt: new Date().toISOString(),
          }}
        />
        <ChatComposer
          inputValue=""
          onInputChange={() => {}}
          onSubmit={() => {}}
          onKeyDown={() => {}}
          loading={false}
          selectedFile={null}
          onFileSelect={() => {}}
          uploading={false}
          onUpload={() => {}}
          fileInputRef={{ current: null }}
        />
      </>,
    )
    expect(container.textContent).toContain('Focused document.pdf')
    expect(container.textContent).toContain('All documents')
    fireEvent.click(
      container.querySelector<HTMLButtonElement>('[aria-label="Search all documents"]')!,
    )
    expect(onClear).toHaveBeenCalledOnce()
    await expectAccessible(container)
  })

  it('keeps modal dialogs accessible', async () => {
    const { container, rerender } = render(
      <Modal open onClose={() => {}} title="Edit document" description="Change the name.">
        <button type="button">Save</button>
      </Modal>,
    )
    await expectAccessible(container)

    rerender(
      <ConfirmationDialog
        open
        title="Delete document"
        description="This action cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    await expectAccessible(container)
  })

  it('traps modal focus, closes on Escape, and restores the opener focus', () => {
    function FocusHarness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Focus test">
            <button type="button">First action</button>
            <button type="button">Last action</button>
          </Modal>
        </>
      )
    }
    const { getByRole } = render(<FocusHarness />)
    const opener = getByRole('button', { name: 'Open dialog' })
    opener.focus()
    fireEvent.click(opener)
    const first = getByRole('button', { name: 'First action' })
    const close = getByRole('button', { name: 'Close' })

    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(close, { key: 'Escape' })

    expect(getByRole('button', { name: 'Open dialog' })).toBe(opener)
    expect(document.activeElement).toBe(opener)
  })

  it('keeps history and collection screens accessible', async () => {
    useChatStore.setState({ sessions: [], activeSessionId: '' })
    const history = render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    )
    await history.findByText('No conversations yet')
    await expectAccessible(history.container)
    history.unmount()

    const collections = render(<CollectionsPage />)
    await collections.findByText('No collections yet')
    await expectAccessible(collections.container)
  })

  it('loads and synchronizes server conversations on the history screen', async () => {
    useChatStore.setState({ sessions: [], activeSessionId: '' })
    vi.mocked(conversationService.listConversations).mockResolvedValueOnce({
      conversations: [
        {
          conversation_id: 'server-1',
          title: 'Server conversation',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          message_count: 1,
        },
      ],
      total: 1,
    })
    vi.mocked(conversationService.getConversation).mockResolvedValueOnce({
      conversation_id: 'server-1',
      title: 'Server conversation',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      messages: [
        {
          role: 'assistant',
          content: 'Synchronized answer',
          created_at: '2025-01-01T00:00:00Z',
        },
      ],
    })

    const history = render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    )
    await history.findByText('Server conversation')
    expect(await history.findByText('Synchronized answer')).toBeTruthy()
  })

  it('exposes dropdown state and supports menu keyboard navigation', () => {
    const onSelect = vi.fn()
    const { getByRole, getAllByRole } = render(
      <Dropdown
        trigger="More actions"
        items={[
          { label: 'Rename', onClick: onSelect },
          { label: 'Delete', danger: true, onClick: onSelect },
        ]}
      />,
    )
    const trigger = getByRole('button', { name: 'More actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })

    const items = getAllByRole('menuitem')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
  })

  it('cancels an active response with document-level Escape', () => {
    const controller = new AbortController()
    useChatStore.setState({
      activeSessionId: 'session-escape',
      activeStream: {
        sessionId: 'session-escape',
        assistantId: 'assistant-escape',
        controller,
        status: null,
        traceSteps: [],
      },
      sessions: [
        {
          id: 'session-escape',
          serverConversationId: null,
          title: 'Escape test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'assistant-escape',
              role: 'assistant',
              content: 'Partial answer',
              createdAt: new Date().toISOString(),
              isStreaming: true,
            },
          ],
        },
      ],
    })
    render(
      <MemoryRouter>
        <KeyboardShortcutsHarness />
      </MemoryRouter>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(controller.signal.aborted).toBe(true)
    expect(useChatStore.getState().activeStream).toBeNull()
    expect(useChatStore.getState().sessions[0].messages[0]).toMatchObject({
      isStreaming: false,
      interrupted: true,
    })
  })
})

function KeyboardShortcutsHarness() {
  useKeyboardShortcuts()
  return <div />
}
