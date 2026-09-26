import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchPage } from '../pages/SearchPage'
import { queryDocuments } from '../services/query.service'

vi.mock('../services/query.service', () => ({
  queryDocuments: vi.fn(),
}))

const queryDocumentsMock = vi.mocked(queryDocuments)

describe('SearchPage', () => {
  beforeEach(() => {
    localStorage.clear()
    queryDocumentsMock.mockReset()
    queryDocumentsMock.mockResolvedValue({
      answer: 'answer',
      sources: [],
      retrieval_time_ms: 0,
      generation_time_ms: 0,
      total_time_ms: 0,
    })
  })

  it('searches using the selected history entry', async () => {
    localStorage.setItem('rag-search-history', JSON.stringify(['historical query']))
    render(<SearchPage />)

    fireEvent.click(screen.getByRole('button', { name: /historical query/i }))

    await waitFor(() => {
      expect(queryDocumentsMock).toHaveBeenCalledOnce()
      expect(queryDocumentsMock.mock.calls[0][0]).toEqual({
        question: 'historical query',
        use_reranking: true,
      })
      const options = queryDocumentsMock.mock.calls[0][1]
      expect(options?.signal).toBeInstanceOf(AbortSignal)
      expect(options?.timeout).toBe(30000)
    })
  })

  it('aborts an older search and ignores its late response', async () => {
    let resolveOlder:
      | ((value: {
          answer: string
          sources: []
          retrieval_time_ms: number
          generation_time_ms: number
          total_time_ms: number
        }) => void)
      | undefined
    queryDocumentsMock
      .mockImplementationOnce((_payload, options) => {
        expect(options?.signal?.aborted).toBe(false)
        return new Promise((resolve) => {
          resolveOlder = resolve
        })
      })
      .mockResolvedValueOnce({
        answer: 'new answer',
        sources: [],
        retrieval_time_ms: 0,
        generation_time_ms: 0,
        total_time_ms: 0,
      })
    render(<SearchPage />)
    const input = screen.getByPlaceholderText(/semantic search/i)

    fireEvent.change(input, { target: { value: 'older query' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const olderSignal = queryDocumentsMock.mock.calls[0][1]?.signal

    fireEvent.change(input, { target: { value: 'newer query' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await screen.findByText('new answer')
    expect(olderSignal?.aborted).toBe(true)

    resolveOlder?.({
      answer: 'stale answer',
      sources: [],
      retrieval_time_ms: 0,
      generation_time_ms: 0,
      total_time_ms: 0,
    })
    await waitFor(() => expect(screen.queryByText('stale answer')).toBeNull())
    expect(screen.getByText('new answer')).toBeTruthy()
  })
})
