import api from '../lib/axios'
import type { QueryRequest, QueryResponse, RagTraceStep } from '../types/chat'

export const queryDocuments = async (payload: QueryRequest): Promise<QueryResponse> => {
  const res = await api.post<QueryResponse>('/query', payload)
  return res.data
}

export const queryDocumentsStream = async (
  payload: QueryRequest,
  onToken: (token: string) => void,
  onSources: (sources: QueryResponse['sources']) => void,
  onStatus: (status: string) => void,
  onTrace: (step: RagTraceStep) => void,
  onDone: (totalTimeMs?: number) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await fetch(`${api.defaults.baseURL}/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.VITE_API_KEY ? { 'X-API-Key': import.meta.env.VITE_API_KEY } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    if (signal?.aborted) return
    let detail = `HTTP ${response.status}: ${response.statusText}`
    try {
      const body = await response.json()
      if (body.detail) detail = body.detail
    } catch {
      // keep default
    }
    onError(detail)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    if (!signal?.aborted) onError('No response stream')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let done = false

  try {
    while (!done) {
      const result = await reader.read()
      done = result.done
      if (done) break

      buffer += decoder.decode(result.value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'token') {
              if (!signal?.aborted) onToken(event.content)
            } else if (event.type === 'sources') {
              if (!signal?.aborted) onSources(event.content)
            } else if (event.type === 'status') {
              if (!signal?.aborted) onStatus(event.content)
            } else if (event.type === 'trace') {
              if (!signal?.aborted) onTrace(event.content)
            } else if (event.type === 'done') {
              if (signal?.aborted) return
              onDone(event.total_time_ms)
              return
            } else if (event.type === 'error') {
              if (!signal?.aborted) onError(event.content)
              return
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!signal?.aborted) onDone()
}
