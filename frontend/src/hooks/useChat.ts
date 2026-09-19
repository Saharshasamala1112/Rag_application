import { useState, useCallback } from 'react'
import { queryDocumentsStream } from '../services/query.service'
import { useChatStore } from '../store/chat.store'
import { useDocumentStore } from '../store/document.store'
import type { ChatMessage, ChatSource } from '../types/chat'

export const useChat = () => {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const addUserMessage = useChatStore((state) => state.addUserMessage)
  const addAssistantMessage = useChatStore((state) => state.addAssistantMessage)
  const updateAssistantMessage = useChatStore((state) => state.updateAssistantMessage)
  const setStreamingSources = useChatStore((state) => state.setStreamingSources)
  const finishStreaming = useChatStore((state) => state.finishStreaming)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const createSession = useChatStore((state) => state.createSession)
  const setActiveSession = useChatStore((state) => state.setActiveSession)
  const deleteSession = useChatStore((state) => state.deleteSession)

  const activeDocumentId = useDocumentStore((state) => state.activeDocumentId)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMessages = useCallback(() => {
    const active = sessions.find((s) => s.id === activeSessionId)
    return active?.messages ?? []
  }, [sessions, activeSessionId])

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

    // Create placeholder for streaming response
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }
    addAssistantMessage(assistantMessage)

    try {
      await queryDocumentsStream(
        {
          question,
          document_id: activeDocumentId,
          use_expansion: true,
          use_reranking: true,
        },
        // onToken
        (token: string) => {
          const current = useChatStore.getState().getMessages()
          const msg = current.find((m) => m.id === assistantId)
          const newContent = (msg?.content || '') + token
          updateAssistantMessage(assistantId, newContent)
        },
        // onSources
        (sources: ChatSource[]) => {
          setStreamingSources(assistantId, sources)
        },
        // onDone
        () => {
          finishStreaming(assistantId)
          setLoading(false)
        },
        // onError
        (errorMsg: string) => {
          setError(errorMsg)
          updateAssistantMessage(assistantId, `Error: ${errorMsg}`)
          finishStreaming(assistantId)
          setLoading(false)
        },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to answer right now'
      setError(message)
      updateAssistantMessage(assistantId, `Error: ${message}`)
      finishStreaming(assistantId)
      setLoading(false)
    }
  }

  return {
    messages: getMessages(),
    loading,
    error,
    ask,
    clearMessages,
    activeSessionId,
    createSession,
    sessions,
    setActiveSession,
    deleteSession,
  }
}
