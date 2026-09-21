export type ChatRole = 'user' | 'assistant'

export type ChatSource = {
  chunk_id: number
  content: string
  source: string
  score: number
  page_number: number | null
  header: string | null
}

export type RagTraceStep = {
  step: 'retrieval' | 'reranking' | 'context' | 'generation'
  timing_ms: number
  chunks_found?: number
  documents_searched?: number
  chunks_after_rerank?: number
  context_chars?: number
  context_chunks?: number
  sources_count?: number
}

export type RagTrace = {
  steps: RagTraceStep[]
  total_time_ms?: number
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  sources?: ChatSource[]
  trace?: RagTrace
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
  type: 'sources' | 'token' | 'done' | 'error' | 'trace'
  content: string | ChatSource[] | RagTraceStep
}
