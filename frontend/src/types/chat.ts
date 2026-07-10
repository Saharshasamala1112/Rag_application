export type ChatRole = 'user' | 'assistant'

export type ChatSource = {
  id: string
  title: string
  snippet: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  sources?: ChatSource[]
  createdAt: string
}

export type ChatRequest = {
  question: string
}

export type AskQuestionResponse = {
  answer: string
  sources?: ChatSource[]
}

