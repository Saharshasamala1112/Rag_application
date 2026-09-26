import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RagTracePanel } from '../components/layout/RagTracePanel'
import { useChatStore } from '../store/chat.store'

describe('RagTracePanel', () => {
  beforeEach(() => {
    useChatStore.setState({
      activeSessionId: 'session-1',
      sessions: [{
        id: 'session-1',
        serverConversationId: null,
        title: 'Test session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: 'assistant-1',
          role: 'assistant',
          content: 'Answer text',
          createdAt: new Date().toISOString(),
          trace: {
            steps: [{ step: 'retrieval', timing_ms: 12, chunks_found: 2 }],
          },
          sources: [{
            chunk_id: 1,
            content: 'Retrieved evidence',
            source: 'guide.md',
            score: 1,
            page_number: null,
            header: null,
          }],
        }],
      }],
    })
  })

  it('renders trace steps and sources from the active session', () => {
    render(<RagTracePanel />)

    expect(screen.getByText('Retrieval')).toBeTruthy()
    expect(screen.getByText('Retrieved evidence')).toBeTruthy()
    expect(screen.getByText('guide.md')).toBeTruthy()
  })
})
