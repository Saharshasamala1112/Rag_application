import api from '../lib/axios'
import type { AskQuestionResponse, ChatRequest } from '../types/chat'

export const askQuestion = async (payload: ChatRequest): Promise<AskQuestionResponse> => {
  const res = await api.post<AskQuestionResponse>('/chat/ask', payload)
  return res.data
}

