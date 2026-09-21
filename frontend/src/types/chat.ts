export type ChatRole = 'user' | 'assistant'

export type ChatSource = {
  chunk_id: number
  content: string
  source: string
  score: number
  page_number: number | null
  header: string | null
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  sources?: ChatSource[]
  createdAt: string
  isStreaming?: boolean
}

export type QueryRequest = {
  question: string
  document_id?: string | null
  conversation_id?: string | null
  top_k?: number
  use_reranking?: boolean
}

export type QueryResponse = {
  answer: string
  sources: ChatSource[]
  retrieval_time_ms: number
  generation_time_ms: number
  total_time_ms: number
}

export type SSEEvent = {
  type: 'sources' | 'token' | 'done' | 'error'
  content: string | ChatSource[]
}
