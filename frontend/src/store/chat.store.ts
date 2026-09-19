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
  messages: ChatMessage[]
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

const saveSessions = (sessions: ChatSession[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

const createSessionData = (): ChatSession => {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}`,
    title: `Session ${new Date().toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`,
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
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: [...session.messages, message],
            updatedAt: new Date().toISOString(),
          }
        : session,
    )
    saveSessions(updated)
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
    saveSessions(updated)
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
    saveSessions(updated)
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
    saveSessions(updated)
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
    saveSessions(updated)
    set({ sessions: updated })
  },

  clearMessages: () => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.map((session) =>
      session.id === activeSessionId
        ? { ...session, messages: [], updatedAt: new Date().toISOString() }
        : session,
    )
    saveSessions(updated)
    set({ sessions: updated })
  },

  createSession: () => {
    const { sessions } = get()
    const nextSession = createSessionData()
    const updated = [nextSession, ...sessions]
    saveSessions(updated)
    set({ sessions: updated, activeSessionId: nextSession.id })
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId })
  },

  deleteSession: (sessionId) => {
    const { sessions, activeSessionId } = get()
    const updated = sessions.filter((session) => session.id !== sessionId)
    const nextActive = sessionId === activeSessionId ? updated[0]?.id ?? '' : activeSessionId
    saveSessions(updated)
    set({ sessions: updated, activeSessionId: nextActive })
  },
}))
