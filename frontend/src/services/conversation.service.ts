import api from '../lib/axios'

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: Record<string, unknown>[]
  created_at: string
  interrupted?: boolean
}

export type ConversationSummary = {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export type ConversationDetail = {
  conversation_id: string
  title: string
  messages: ConversationMessage[]
  created_at: string
  updated_at: string
}

export type ConversationListResponse = {
  conversations: ConversationSummary[]
  total: number
}

export const listConversations = async (): Promise<ConversationListResponse> => {
  const res = await api.get<ConversationListResponse>('/conversations')
  return res.data
}

export const getConversation = async (id: string): Promise<ConversationDetail> => {
  const res = await api.get<ConversationDetail>(`/conversations/${id}`)
  return res.data
}

export const createConversation = async (title?: string): Promise<ConversationDetail> => {
  const res = await api.post<ConversationDetail>('/conversations', { title: title ?? null })
  return res.data
}

export const updateConversationTitle = async (id: string, title: string): Promise<ConversationDetail> => {
  const res = await api.patch<ConversationDetail>(`/conversations/${id}`, { title })
  return res.data
}

export const deleteConversation = async (id: string): Promise<void> => {
  await api.delete(`/conversations/${id}`)
}
