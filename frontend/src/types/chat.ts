import type {
  ApiQueryRequest,
  ApiQueryResponse,
  ApiSourceChunk,
} from './api'

export type ChatRole = 'user' | 'assistant'

export type ChatSource = ApiSourceChunk

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
  interrupted?: boolean
  error?: boolean
}

export type QueryRequest = ApiQueryRequest

export type QueryResponse = ApiQueryResponse

export type SSEEvent =
  | { type: 'sources'; content: ChatSource[] }
  | {
      type: 'token' | 'status' | 'error'
      content: string
    }
  | {
      type: 'done'
      content: string
      total_time_ms?: number
    }
  | { type: 'trace'; content: RagTraceStep }
