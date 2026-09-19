import api from '../lib/axios'
import type { QueryRequest, QueryResponse } from '../types/chat'

export const queryDocuments = async (payload: QueryRequest): Promise<QueryResponse> => {
  const res = await api.post<QueryResponse>('/query', payload)
  return res.data
}

export const queryDocumentsStream = async (
  payload: QueryRequest,
  onToken: (token: string) => void,
  onSources: (sources: QueryResponse['sources']) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> => {
  const response = await fetch(`${api.defaults.baseURL}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    onError(`HTTP ${response.status}: ${response.statusText}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('No response stream')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'token') {
            onToken(event.content)
          } else if (event.type === 'sources') {
            onSources(event.content)
          } else if (event.type === 'done') {
            onDone()
          } else if (event.type === 'error') {
            onError(event.content)
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  onDone()
}
