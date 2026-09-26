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
      expect(queryDocumentsMock).toHaveBeenCalledWith({
        question: 'historical query',
        use_reranking: true,
      })
    })
  })
})
