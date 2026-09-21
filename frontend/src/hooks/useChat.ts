import { useState, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { queryDocumentsStream } from '../services/query.service'
import { useChatStore } from '../store/chat.store'
import { useDocumentStore } from '../store/document.store'
import type { ChatMessage, ChatSource, RagTraceStep } from '../types/chat'

export const useChat = () => {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const addUserMessage = useChatStore((state) => state.addUserMessage)
  const addAssistantMessage = useChatStore((state) => state.addAssistantMessage)
  const updateAssistantMessage = useChatStore((state) => state.updateAssistantMessage)
  const setStreamingSources = useChatStore((state) => state.setStreamingSources)
  const setTrace = useChatStore((state) => state.setTrace)
  const finishStreaming = useChatStore((state) => state.finishStreaming)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const createSession = useChatStore((state) => state.createSession)
  const setActiveSession = useChatStore((state) => state.setActiveSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const getServerConversationId = useChatStore((state) => state.getServerConversationId)

  const activeDocumentId = useDocumentStore((state) => state.activeDocumentId)

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [traceSteps, setTraceSteps] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const messages = useMemo(() => {
    const active = sessions.find((s) => s.id === activeSessionId)
    return active?.messages ?? []
  }, [sessions, activeSessionId])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setStatus(null)
  }, [])

  const ask = useCallback(async (question: string) => {
    const serverConversationId = getServerConversationId()

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }
    addUserMessage(userMessage)
    setLoading(true)
    setStatus('Preparing...')
    setTraceSteps([])

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

    const traceSteps: RagTraceStep[] = []
    const controller = new AbortController()
    abortRef.current = controller

    try {
      await queryDocumentsStream(
        {
          question,
          document_id: activeDocumentId,
          conversation_id: serverConversationId,
          use_reranking: true,
        },
        (token: string) => {
          if (controller.signal.aborted) return
          setStatus(null)
          const current = useChatStore.getState().getMessages()
          const msg = current.find((m) => m.id === assistantId)
          const newContent = (msg?.content || '') + token
          updateAssistantMessage(assistantId, newContent)
        },
        (sources: ChatSource[]) => {
          if (controller.signal.aborted) return
          setStreamingSources(assistantId, sources)
        },
        (statusMsg: string) => {
          if (controller.signal.aborted) return
          setStatus(statusMsg)
        },
        (step: RagTraceStep) => {
          if (controller.signal.aborted) return
          traceSteps.push(step)
          setTraceSteps([...traceSteps.map((s) => s.step)])
          setTrace(assistantId, { steps: [...traceSteps] })
        },
        (totalTimeMs?: number) => {
          if (traceSteps.length > 0) {
            setTrace(assistantId, { steps: [...traceSteps], total_time_ms: totalTimeMs })
          }
          finishStreaming(assistantId)
          setLoading(false)
          setStatus(null)
          abortRef.current = null
        },
        (errorMsg: string) => {
          if (controller.signal.aborted) return
          toast.error(errorMsg)
          updateAssistantMessage(assistantId, `Error: ${errorMsg}`)
          finishStreaming(assistantId)
          setLoading(false)
          setStatus(null)
          abortRef.current = null
        },
      )
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Unable to answer right now'
      toast.error(message)
      updateAssistantMessage(assistantId, `Error: ${message}`)
      finishStreaming(assistantId)
      setLoading(false)
      setStatus(null)
      abortRef.current = null
    }
  }, [activeDocumentId, addUserMessage, addAssistantMessage, updateAssistantMessage, setStreamingSources, setTrace, finishStreaming, getServerConversationId])

  return {
    messages,
    loading,
    status,
    traceSteps,
    ask,
    cancel,
    clearMessages,
    activeSessionId,
    createSession,
    sessions,
    setActiveSession,
    deleteSession,
  }
}
