import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChat } from '../hooks/useChat'
import { useChatStore } from '../store/chat.store'
import { useDocumentStore } from '../store/document.store'
import { queryDocumentsStream } from '../services/query.service'
import * as conversationService from '../services/conversation.service'
import { ApiError } from '../lib/axios'

vi.mock('../services/query.service', () => ({
  queryDocumentsStream: vi.fn(),
}))

vi.mock('../services/conversation.service', () => ({
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
}))

const streamMock = vi.mocked(queryDocumentsStream)
const getConversationMock = vi.mocked(conversationService.getConversation)
const createConversationMock = vi.mocked(conversationService.createConversation)

const conversationDetail = (id: string) => ({
  conversation_id: id,
  title: 'Test conversation',
  messages: [],
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
})

beforeEach(() => {
  streamMock.mockReset()
  getConversationMock.mockReset()
  createConversationMock.mockReset()
  createConversationMock.mockResolvedValue(conversationDetail('conv-created12345'))
  useChatStore.setState({
    activeStream: null,
    activeSessionId: 'session-1',
    sessions: [
      {
        id: 'session-1',
        serverConversationId: null,
        title: 'Test session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    ],
  })
  useDocumentStore.setState({ activeDocumentId: 'focused-document' })
})

describe('useChat', () => {
  it('uses the selected document for each submitted question', async () => {
    streamMock.mockImplementation((...args) => {
      args[5]()
      return Promise.resolve()
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

  it('stores stream failures as structured error state', async () => {
    streamMock.mockImplementation((...args) => {
      args[6]('The service is unavailable.')
      return Promise.resolve()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('question')
    })

    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'The service is unavailable.',
      error: true,
      isStreaming: false,
    })
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
      interrupted: true,
    })
  })

  it('keeps a cancellable stream in the store across hook unmounts', async () => {
    let resolveStream: () => void = () => {}
    let tokenCallback: ((token: string) => void) | undefined
    streamMock.mockImplementation(async (...args) => {
      tokenCallback = args[1]
      await new Promise<void>((resolve) => {
        resolveStream = resolve
      })
      tokenCallback?.('late token')
    })

    const firstMount = renderHook(() => useChat())
    let request: Promise<void> = Promise.resolve()
    await act(async () => {
      request = firstMount.result.current.ask('keep streaming')
      await Promise.resolve()
    })
    firstMount.unmount()

    const secondMount = renderHook(() => useChat())
    expect(secondMount.result.current.loading).toBe(true)
    act(() => secondMount.result.current.cancel())
    resolveStream()
    await act(async () => request)

    expect(secondMount.result.current.loading).toBe(false)
    expect(useChatStore.getState().sessions[0].messages.at(-1)).toMatchObject({
      content: '',
      interrupted: true,
      isStreaming: false,
    })
  })

  it('updates the originating session after navigation', async () => {
    useChatStore.setState((state) => ({
      sessions: [
        ...state.sessions,
        {
          id: 'session-2',
          serverConversationId: null,
          title: 'Other session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      ],
    }))
    let resolveStream: () => void = () => {}
    let tokenCallback: ((token: string) => void) | undefined
    streamMock.mockImplementation(async (...args) => {
      tokenCallback = args[1]
      await new Promise<void>((resolve) => {
        resolveStream = resolve
      })
      tokenCallback?.('answer')
      args[5]()
    })
    const { result } = renderHook(() => useChat())
    let request: Promise<void> = Promise.resolve()
    await act(async () => {
      request = result.current.ask('question')
      await Promise.resolve()
    })
    act(() => useChatStore.getState().setActiveSession('session-2'))
    resolveStream()
    await act(async () => request)

    const sessions = useChatStore.getState().sessions
    expect(sessions.find((session) => session.id === 'session-1')?.messages.at(-1)).toMatchObject({
      content: 'answer',
      isStreaming: false,
    })
    expect(sessions.find((session) => session.id === 'session-2')?.messages).toEqual([])
  })

  it('creates a conversation before the first question', async () => {
    streamMock.mockImplementation((...args) => {
      args[5]()
      return Promise.resolve()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('first question')
    })

    expect(createConversationMock).toHaveBeenCalledTimes(1)
    expect(getConversationMock).not.toHaveBeenCalled()
    expect(streamMock.mock.calls[0][0].conversation_id).toBe('conv-created12345')
    expect(useChatStore.getState().sessions[0].serverConversationId).toBe('conv-created12345')
  })

  it('replaces a stale conversation id the server no longer knows', async () => {
    useChatStore.setState((state) => ({
      sessions: state.sessions.map((session) => ({
        ...session,
        serverConversationId: 'conv-stale1234',
      })),
    }))
    getConversationMock.mockRejectedValue(new ApiError('Conversation not found.', 404, null))
    streamMock.mockImplementation((...args) => {
      args[5]()
      return Promise.resolve()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('question after server reset')
    })

    expect(getConversationMock).toHaveBeenCalledWith('conv-stale1234')
    expect(createConversationMock).toHaveBeenCalledTimes(1)
    expect(streamMock.mock.calls[0][0].conversation_id).toBe('conv-created12345')
    expect(useChatStore.getState().sessions[0].serverConversationId).toBe('conv-created12345')
  })

  it('keeps the existing conversation when validation fails transiently', async () => {
    useChatStore.setState((state) => ({
      sessions: state.sessions.map((session) => ({
        ...session,
        serverConversationId: 'conv-keepme1234',
      })),
    }))
    getConversationMock.mockRejectedValue(new ApiError('Request failed', undefined, undefined))
    streamMock.mockImplementation((...args) => {
      args[5]()
      return Promise.resolve()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('question')
    })

    expect(createConversationMock).not.toHaveBeenCalled()
    expect(streamMock.mock.calls[0][0].conversation_id).toBe('conv-keepme1234')
  })

  it('falls back to local-only mode when the server is unreachable', async () => {
    createConversationMock.mockRejectedValue(new ApiError('Network Error', undefined, undefined))
    streamMock.mockImplementation((...args) => {
      args[5]()
      return Promise.resolve()
    })
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.ask('offline question')
    })

    expect(streamMock.mock.calls[0][0].conversation_id).toBeNull()
    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: '',
      isStreaming: false,
    })
  })
})
