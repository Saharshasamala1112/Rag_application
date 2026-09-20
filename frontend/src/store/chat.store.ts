import { create } from 'zustand'
import type { ChatMessage, ChatSource } from '../types/chat'

const STORAGE_KEY = 'rag-chat-sessions'

type ChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

type ChatState = {
  sessions: ChatSession[]
  activeSessionId: string
  addUserMessage: (message: ChatMessage) => void
  addAssistantMessage: (message: ChatMessage) => void
  updateAssistantMessage: (messageId: string, content: string) => void
  setStreamingSources: (messageId: string, sources: ChatSource[]) => void
  finishStreaming: (messageId: string) => void
  clearMessages: () => void
  createSession: () => void
  setActiveSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  getMessages: () => ChatMessage[]
}

const loadSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatSession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

const saveSessionsDebounced = (sessions: ChatSession[]) => {
  if (typeof window === 'undefined') return
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, 500)
}

const saveSessionsImmediate = (sessions: ChatSession[]) => {
  if (typeof window === 'undefined') return
  if (saveTimeout) clearTimeout(saveTimeout)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

const createSessionData = (title?: string): ChatSession => {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}`,
    title: title || `Session ${new Date().toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

const persistedSessions = loadSessions()
const initialSessions = persistedSessions.length ? persistedSessions : [createSessionData()]
const initialActiveId = initialSessions[0].id

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: initialSessions,
  activeSessionId: initialActiveId,

  getMessages: () => {
    const active = get().sessions.find((session) => session.id === get().activeSessionId)
    return active?.messages ?? []
  },

  addUserMessage: (message) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) => {
      if (session.id !== activeSessionId) return session
      const newMessages = [...session.messages, message]
      // Auto-title from first user message
      const title = session.messages.length === 0
        ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
        : session.title
      return {
        ...session,
        title,
        messages: newMessages,
        updatedAt: new Date().toISOString(),
      }
    })
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  addAssistantMessage: (message) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: [...session.messages, message],
            updatedAt: new Date().toISOString(),
          }
        : session,
    )
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  updateAssistantMessage: (messageId, content) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, content } : msg,
            ),
          }
        : session,
    )
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  setStreamingSources: (messageId, sources) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, sources } : msg,
            ),
          }
        : session,
    )
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  finishStreaming: (messageId) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: false } : msg,
            ),
            updatedAt: new Date().toISOString(),
          }
        : session,
    )
    saveSessionsImmediate(updated)
    set({ sessions: updated })
  },

  clearMessages: () => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? { ...session, messages: [], updatedAt: new Date().toISOString() }
        : session,
    )
    saveSessionsImmediate(updated)
    set({ sessions: updated })
  },

  createSession: () => {
    const { sessions } = get()
    const nextSession = createSessionData()
    const updated = [nextSession, ...sessions]
    saveSessionsImmediate(updated)
    set({ sessions: updated, activeSessionId: nextSession.id })
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId })
  },

  deleteSession: (sessionId) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.filter((session) => session.id !== sessionId)

    // Handle empty sessions — create a new one if all deleted
    if (updated.length === 0) {
      const newSession = createSessionData()
      saveSessionsImmediate([newSession])
      set({ sessions: [newSession], activeSessionId: newSession.id })
      return
    }

    const nextActive = sessionId === activeSessionId
      ? updated[0].id
      : activeSessionId
    saveSessionsImmediate(updated)
    set({ sessions: updated, activeSessionId: nextActive })
  },
}))
