import { useState } from 'react'
import { askQuestion } from '../services/query.service'
import type { ChatMessage } from '../types/chat'

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = async (question: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
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
      setMessages((prev) => [...prev, assistantMessage])
      return assistantMessage
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to answer right now'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, error, ask }
}
