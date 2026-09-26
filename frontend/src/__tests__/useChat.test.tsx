import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChat } from '../hooks/useChat'
import { useChatStore } from '../store/chat.store'
import { useDocumentStore } from '../store/document.store'
import { queryDocumentsStream } from '../services/query.service'

vi.mock('../services/query.service', () => ({
  queryDocumentsStream: vi.fn(),
}))

const streamMock = vi.mocked(queryDocumentsStream)

beforeEach(() => {
  streamMock.mockReset()
  useChatStore.setState({
    activeSessionId: 'session-1',
    sessions: [{
      id: 'session-1',
      serverConversationId: null,
      title: 'Test session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    }],
  })
  useDocumentStore.setState({ activeDocumentId: 'focused-document' })
})

describe('useChat', () => {
  it('uses the selected document for each submitted question', async () => {
    streamMock.mockImplementation(async (...args) => {
      args[5]()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('first question')
      await result.current.ask('second question')
    })

    expect(streamMock.mock.calls.map(([payload]) => payload.document_id)).toEqual([
      'focused-document',
      'focused-document',
    ])
  })

  it('aborts the active stream and ignores late tokens and completion', async () => {
    let resolveStream: () => void = () => {}
    let capturedSignal: AbortSignal | undefined
    streamMock.mockImplementation(async (...args) => {
      capturedSignal = args[7]
      await new Promise<void>((resolve) => {
        resolveStream = resolve
      })
      args[1]('late token')
      args[5]()
    })
    const { result } = renderHook(() => useChat())
    let request: Promise<void> = Promise.resolve()

    await act(async () => {
      request = result.current.ask('cancel me')
      await Promise.resolve()
    })
    act(() => result.current.cancel())
    resolveStream()
    await act(async () => request)

    expect(capturedSignal?.aborted).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: '',
      isStreaming: false,
    })
  })
})
