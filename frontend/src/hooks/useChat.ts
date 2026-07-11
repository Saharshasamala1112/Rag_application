import { useState } from 'react'
import { askQuestion } from '../services/query.service'
import { useChatStore } from '../store/chat.store'
import type { ChatMessage } from '../types/chat'

export const useChat = () => {
  const messages = useChatStore((state) => state.messages)
  const addUserMessage = useChatStore((state) => state.addUserMessage)
  const addAssistantMessage = useChatStore((state) => state.addAssistantMessage)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const createSession = useChatStore((state) => state.createSession)
  const sessions = useChatStore((state) => state.sessions)
  const setActiveSession = useChatStore((state) => state.setActiveSession)
  const deleteSession = useChatStore((state) => state.deleteSession)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = async (question: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }
    addUserMessage(userMessage)
    setLoading(true)
    setError(null)

    try {
      const response = await askQuestion({ question })
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        createdAt: new Date().toISOString(),
      }
      addAssistantMessage(assistantMessage)
      return assistantMessage
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to answer right now'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, error, ask, clearMessages, activeSessionId, createSession, sessions, setActiveSession, deleteSession }
}
