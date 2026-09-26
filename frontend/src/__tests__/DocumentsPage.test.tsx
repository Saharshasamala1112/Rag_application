import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentsPage } from '../pages/DocumentsPage'
import { useDocumentStore } from '../store/document.store'

const { fetchDocumentsMock } = vi.hoisted(() => ({ fetchDocumentsMock: vi.fn() }))

vi.mock('../hooks/useUpload', () => ({
  useUpload: () => ({
    uploadBatch: vi.fn(),
    loading: false,
    uploadQueue: [],
    fetchDocuments: fetchDocumentsMock,
  }),
}))

describe('DocumentsPage', () => {
  beforeEach(() => {
    fetchDocumentsMock.mockReset()
    useDocumentStore.setState({ documents: [] })
  })

  it('fetches documents when mounted directly', () => {
    render(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>,
    )

    expect(fetchDocumentsMock).toHaveBeenCalledOnce()
  })
})
