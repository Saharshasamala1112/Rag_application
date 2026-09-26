import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../store/chat.store'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('ChatStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store to initial state
    useChatStore.setState({
      sessions: [
        {
          id: 'session-init',
          serverConversationId: null,
          title: 'Initial Session',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeSessionId: 'session-init',
    })
  })

  it('creates a session with default title', () => {
    const { createSession } = useChatStore.getState()
    const newId = createSession()
    const newSessions = useChatStore.getState().sessions
    expect(newSessions.length).toBe(2)
    expect(newSessions[0].title).toMatch(/Session/)
    expect(newId).toBe(newSessions[0].id)
  })

  it('adds a user message to active session', () => {
    const { addUserMessage } = useChatStore.getState()
    addUserMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date().toISOString(),
    })
    const messages = useChatStore.getState().getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].content).toBe('Hello')
  })

  it('adds an assistant message', () => {
    const { addAssistantMessage } = useChatStore.getState()
    addAssistantMessage({
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there',
      createdAt: new Date().toISOString(),
    })
    const messages = useChatStore.getState().getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].role).toBe('assistant')
  })

  it('updates assistant message content', () => {
    const { addAssistantMessage, updateAssistantMessage } = useChatStore.getState()
    addAssistantMessage({
      id: 'msg-3',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    })
    updateAssistantMessage('msg-3', 'Updated content')
    const messages = useChatStore.getState().getMessages()
    expect(messages[0].content).toBe('Updated content')
  })

  it('sets streaming sources on message', () => {
    const { addAssistantMessage, setStreamingSources } = useChatStore.getState()
    addAssistantMessage({
      id: 'msg-4',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    })
    const sources = [
      { chunk_id: 1, content: 'test', source: 'doc.pdf', score: 0.9, page_number: 1, header: null },
    ]
    setStreamingSources('msg-4', sources)
    const messages = useChatStore.getState().getMessages()
    expect(messages[0].sources).toEqual(sources)
  })

  it('finishes streaming', () => {
    const { addAssistantMessage, finishStreaming } = useChatStore.getState()
    addAssistantMessage({
      id: 'msg-5',
      role: 'assistant',
      content: 'done',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    })
    finishStreaming('msg-5')
    const messages = useChatStore.getState().getMessages()
    expect(messages[0].isStreaming).toBe(false)
  })

  it('deletes a session', () => {
    const { createSession, deleteSession } = useChatStore.getState()
    createSession()
    const sessions = useChatStore.getState().sessions
    expect(sessions.length).toBe(2)
    const secondId = sessions[1].id
    deleteSession(secondId)
    const after = useChatStore.getState().sessions
    expect(after.length).toBe(1)
  })

  it('switches active session', () => {
    const { createSession, setActiveSession } = useChatStore.getState()
    createSession()
    const sessions = useChatStore.getState().sessions
    const newId = sessions[0].id
    setActiveSession(newId)
    expect(useChatStore.getState().activeSessionId).toBe(newId)
  })

  it('clears messages in active session', () => {
    const { addUserMessage, clearMessages } = useChatStore.getState()
    addUserMessage({
      id: 'msg-6',
      role: 'user',
      content: 'Test',
      createdAt: new Date().toISOString(),
    })
    expect(useChatStore.getState().getMessages().length).toBe(1)
    clearMessages()
    expect(useChatStore.getState().getMessages().length).toBe(0)
  })

  it('persists to localStorage', async () => {
    const { addUserMessage } = useChatStore.getState()
    addUserMessage({
      id: 'msg-7',
      role: 'user',
      content: 'Persist me',
      createdAt: new Date().toISOString(),
    })
    // Wait for debounced save (500ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 700))
    const stored = localStorageMock.getItem('rag-chat-sessions')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { messages: { content: string }[] }[]
    expect(parsed[0].messages[0].content).toBe('Persist me')
  })
})
