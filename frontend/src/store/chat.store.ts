import { create } from 'zustand'
import type { ChatMessage, ChatSource, RagTrace } from '../types/chat'
import * as conversationService from '../services/conversation.service'

const STORAGE_KEY = 'rag-chat-sessions'

type ChatSession = {
  id: string
  serverConversationId: string | null
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

type ActiveStream = {
  sessionId: string
  assistantId: string
  controller: AbortController
  status: string | null
  traceSteps: string[]
}

type ChatState = {
  sessions: ChatSession[]
  activeSessionId: string
  activeStream: ActiveStream | null
  addUserMessage: (message: ChatMessage, sessionId?: string) => void
  addAssistantMessage: (message: ChatMessage, sessionId?: string) => void
  updateAssistantMessage: (messageId: string, content: string, sessionId?: string) => void
  setMessageError: (messageId: string, error: boolean, sessionId?: string) => void
  setStreamingSources: (messageId: string, sources: ChatSource[], sessionId?: string) => void
  setTrace: (messageId: string, trace: RagTrace, sessionId?: string) => void
  finishStreaming: (messageId: string, sessionId?: string) => void
  interruptStreaming: (messageId: string, sessionId?: string) => void
  setActiveStream: (stream: ActiveStream | null) => void
  setActiveStreamStatus: (controller: AbortController, status: string | null) => void
  setActiveStreamTraceSteps: (controller: AbortController, traceSteps: string[]) => void
  cancelActiveStream: (sessionId?: string) => void
  clearMessages: () => void
  createSession: () => string
  setActiveSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  getMessages: (sessionId?: string) => ChatMessage[]
  getServerConversationId: () => string | null
  loadServerConversations: () => Promise<void>
  syncSessionFromServer: (sessionId: string) => Promise<void>
}

const loadSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatSession[]
    return Array.isArray(parsed)
      ? parsed.map((session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.isStreaming
              ? { ...message, isStreaming: false, interrupted: true }
              : message,
          ),
        }))
      : []
  } catch {
    return []
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let serverConversationLoad: Promise<void> | null = null

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

const createSessionData = (title?: string, serverId?: string): ChatSession => {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}`,
    serverConversationId: serverId ?? null,
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
  activeStream: null,

  getMessages: (sessionId) => {
    const active = get().sessions.find((session) => session.id === (sessionId ?? get().activeSessionId))
    return active?.messages ?? []
  },

  getServerConversationId: () => {
    const active = get().sessions.find((session) => session.id === get().activeSessionId)
    return active?.serverConversationId ?? null
  },

  addUserMessage: (message, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) => {
      if (session.id !== targetSessionId) return session
      const newMessages = [...session.messages, message]
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

  addAssistantMessage: (message, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
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

  updateAssistantMessage: (messageId, content, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
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

  setMessageError: (messageId, error, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, error } : msg,
            ),
          }
        : session,
    )
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  setStreamingSources: (messageId, sources, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
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

  setTrace: (messageId, trace, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId ? { ...msg, trace } : msg,
            ),
          }
        : session,
    )
    saveSessionsDebounced(updated)
    set({ sessions: updated })
  },

  finishStreaming: (messageId, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
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
    set({
      sessions: updated,
      activeStream:
        get().activeStream?.assistantId === messageId ? null : get().activeStream,
    })
  },

  interruptStreaming: (messageId, sessionId) => {
    const { sessions, activeSessionId } = get()
    const targetSessionId = sessionId ?? activeSessionId
    const updated = sessions.map((session) =>
      session.id === targetSessionId
        ? {
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, isStreaming: false, interrupted: true }
                : msg,
            ),
            updatedAt: new Date().toISOString(),
          }
        : session,
    )
    saveSessionsImmediate(updated)
    set({
      sessions: updated,
      activeStream:
        get().activeStream?.assistantId === messageId ? null : get().activeStream,
    })
  },

  setActiveStream: (activeStream) => set({ activeStream }),

  setActiveStreamStatus: (controller, status) => {
    const activeStream = get().activeStream
    if (activeStream?.controller === controller) {
      set({ activeStream: { ...activeStream, status } })
    }
  },

  setActiveStreamTraceSteps: (controller, traceSteps) => {
    const activeStream = get().activeStream
    if (activeStream?.controller === controller) {
      set({ activeStream: { ...activeStream, traceSteps } })
    }
  },

  cancelActiveStream: (sessionId) => {
    const activeStream = get().activeStream
    if (!activeStream || (sessionId && activeStream.sessionId !== sessionId)) return
    activeStream.controller.abort()
    get().interruptStreaming(activeStream.assistantId, activeStream.sessionId)
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

    // Create server conversation in background
    conversationService.createConversation().then((conv) => {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === nextSession.id ? { ...s, serverConversationId: conv.conversation_id } : s,
        ),
      }))
    }).catch(() => {
      // Server unavailable — local-only mode still works
    })
    return nextSession.id
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId })
  },

  deleteSession: (sessionId) => {
    const { sessions, activeSessionId } = get()
    const session = sessions.find((s) => s.id === sessionId)
    const updated = sessions.filter((session) => session.id !== sessionId)

    // Delete from server in background
    if (session?.serverConversationId) {
      conversationService.deleteConversation(session.serverConversationId).catch(() => {})
    }

    if (updated.length === 0) {
      const newSession = createSessionData()
      saveSessionsImmediate([newSession])
      set({ sessions: [newSession], activeSessionId: newSession.id })
      // Create server conversation
      conversationService.createConversation().then((conv) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === newSession.id ? { ...s, serverConversationId: conv.conversation_id } : s,
          ),
        }))
      }).catch(() => {})
      return
    }

    const nextActive = sessionId === activeSessionId ? updated[0].id : activeSessionId
    saveSessionsImmediate(updated)
    set({ sessions: updated, activeSessionId: nextActive })
  },

  loadServerConversations: async () => {
    if (serverConversationLoad) return serverConversationLoad

    serverConversationLoad = (async () => {
      try {
        const { conversations } = await conversationService.listConversations()
        const { sessions } = get()

        const existingServerIds = new Set(
          sessions.filter((session) => session.serverConversationId)
            .map((session) => session.serverConversationId),
        )

        const newSessions: ChatSession[] = conversations
          .filter((conversation) => !existingServerIds.has(conversation.conversation_id))
          .map((conversation) => ({
            id: `session-${conversation.conversation_id}`,
            serverConversationId: conversation.conversation_id,
            title: conversation.title,
            messages: [],
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
          }))

        if (newSessions.length > 0) {
          const merged = [...newSessions, ...get().sessions]
          saveSessionsImmediate(merged)
          set({ sessions: merged })
          await Promise.all(
            newSessions.map((session) => get().syncSessionFromServer(session.id)),
          )
        }
      } catch {
        // Server unavailable — local-only mode
      } finally {
        serverConversationLoad = null
      }
    })()
    return serverConversationLoad
  },

  syncSessionFromServer: async (sessionId: string) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (!session?.serverConversationId) return

    try {
      const detail = await conversationService.getConversation(session.serverConversationId)
      const messages: ChatMessage[] = detail.messages.map((m, i) => ({
        id: `server-${sessionId}-${i}`,
        role: m.role,
        content: m.content,
        sources: m.sources as ChatSource[] | undefined,
        createdAt: m.created_at,
        isStreaming: false,
        interrupted: m.interrupted,
      }))
      const updated = get().sessions.map((s) =>
        s.id === sessionId ? { ...s, messages, title: detail.title } : s,
      )
      saveSessionsDebounced(updated)
      set({ sessions: updated })
    } catch {
      // Ignore — use local messages
    }
  },
}))
