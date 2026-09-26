import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { queryDocumentsStream } from '../services/query.service'
import { useChatStore } from '../store/chat.store'
import { useDocumentStore } from '../store/document.store'
import type { ChatMessage, ChatSource, RagTraceStep } from '../types/chat'

export const useChat = () => {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const activeStream = useChatStore((state) => state.activeStream)
  const addUserMessage = useChatStore((state) => state.addUserMessage)
  const addAssistantMessage = useChatStore((state) => state.addAssistantMessage)
  const updateAssistantMessage = useChatStore((state) => state.updateAssistantMessage)
  const setMessageError = useChatStore((state) => state.setMessageError)
  const setStreamingSources = useChatStore((state) => state.setStreamingSources)
  const setTrace = useChatStore((state) => state.setTrace)
  const finishStreaming = useChatStore((state) => state.finishStreaming)
  const setActiveStream = useChatStore((state) => state.setActiveStream)
  const setActiveStreamStatus = useChatStore((state) => state.setActiveStreamStatus)
  const setActiveStreamTraceSteps = useChatStore((state) => state.setActiveStreamTraceSteps)
  const cancelActiveStream = useChatStore((state) => state.cancelActiveStream)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const createSession = useChatStore((state) => state.createSession)
  const setActiveSession = useChatStore((state) => state.setActiveSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const ensureServerConversation = useChatStore((state) => state.ensureServerConversation)

  const messages = useMemo(() => {
    const active = sessions.find((session) => session.id === activeSessionId)
    return active?.messages ?? []
  }, [sessions, activeSessionId])

  const isCurrentSessionStreaming = activeStream?.sessionId === activeSessionId

  const cancel = useCallback(() => {
    cancelActiveStream(activeSessionId)
  }, [activeSessionId, cancelActiveStream])

  const ask = useCallback(
    async (question: string) => {
      const previousRequest = useChatStore.getState().activeStream
      if (previousRequest) {
        previousRequest.controller.abort()
        useChatStore
          .getState()
          .interruptStreaming(previousRequest.assistantId, previousRequest.sessionId)
      }

      const sessionId = useChatStore.getState().activeSessionId
      const documentId = useDocumentStore.getState().activeDocumentId
      const now = new Date().toISOString()
      const userMessage: ChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: 'user',
        content: question,
        createdAt: now,
      }
      addUserMessage(userMessage, sessionId)

      const assistantId = `assistant-${crypto.randomUUID()}`
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources: [],
        createdAt: new Date().toISOString(),
        isStreaming: true,
      }
      addAssistantMessage(assistantMessage, sessionId)

      const traceSteps: RagTraceStep[] = []
      const controller = new AbortController()
      setActiveStream({
        sessionId,
        assistantId,
        controller,
        status: 'Preparing...',
        traceSteps: [],
      })

      const isActiveRequest = () => {
        const active = useChatStore.getState().activeStream
        return !controller.signal.aborted && active?.controller === controller
      }

      try {
        // Validates or lazily creates the server conversation so a stale id
        // in localStorage (e.g. conversations cleared on the server) never
        // fails the question with "Conversation not found."
        const serverConversationId = await ensureServerConversation(sessionId)
        await queryDocumentsStream(
          {
            question,
            document_id: documentId,
            conversation_id: serverConversationId,
            use_reranking: true,
          },
          (token: string) => {
            if (!isActiveRequest()) return
            setActiveStreamStatus(controller, null)
            const current = useChatStore.getState().getMessages(sessionId)
            const message = current.find((item) => item.id === assistantId)
            updateAssistantMessage(assistantId, (message?.content || '') + token, sessionId)
          },
          (sources: ChatSource[]) => {
            if (isActiveRequest()) setStreamingSources(assistantId, sources, sessionId)
          },
          (statusMessage: string) => {
            if (isActiveRequest()) setActiveStreamStatus(controller, statusMessage)
          },
          (step: RagTraceStep) => {
            if (!isActiveRequest()) return
            traceSteps.push(step)
            setActiveStreamTraceSteps(
              controller,
              traceSteps.map((traceStep) => traceStep.step),
            )
            setTrace(assistantId, { steps: [...traceSteps] }, sessionId)
          },
          (totalTimeMs?: number) => {
            if (!isActiveRequest()) return
            if (traceSteps.length > 0) {
              setTrace(
                assistantId,
                { steps: [...traceSteps], total_time_ms: totalTimeMs },
                sessionId,
              )
            }
            finishStreaming(assistantId, sessionId)
          },
          (errorMessage: string) => {
            if (!isActiveRequest()) return
            toast.error(errorMessage)
            updateAssistantMessage(assistantId, errorMessage, sessionId)
            setMessageError(assistantId, true, sessionId)
            finishStreaming(assistantId, sessionId)
          },
          controller.signal,
        )
      } catch (error) {
        if (!isActiveRequest()) return
        const message = error instanceof Error ? error.message : 'Unable to answer right now'
        toast.error(message)
        updateAssistantMessage(assistantId, message, sessionId)
        setMessageError(assistantId, true, sessionId)
        finishStreaming(assistantId, sessionId)
      }
    },
    [
      addUserMessage,
      addAssistantMessage,
      updateAssistantMessage,
      setMessageError,
      setStreamingSources,
      setTrace,
      finishStreaming,
      setActiveStream,
      setActiveStreamStatus,
      setActiveStreamTraceSteps,
      ensureServerConversation,
    ],
  )

  return {
    messages,
    loading: isCurrentSessionStreaming,
    status: isCurrentSessionStreaming ? (activeStream?.status ?? null) : null,
    traceSteps: isCurrentSessionStreaming ? (activeStream?.traceSteps ?? []) : [],
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
