import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionsPage } from '../pages/CollectionsPage'
import * as collectionService from '../services/collection.service'
import { useDocumentStore } from '../store/document.store'

vi.mock('../services/collection.service', () => ({
  listCollections: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}))

const listMock = vi.mocked(collectionService.listCollections)
const updateMock = vi.mocked(collectionService.updateCollection)

describe('CollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMock.mockResolvedValue({
      collections: [
        {
          collection_id: 'collection-1',
          name: 'Research',
          description: '',
          document_ids: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
    })
    updateMock.mockImplementation(async (_id, update) => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return {
        collection_id: 'collection-1',
        name: 'Research',
        description: '',
        document_ids: update.document_ids ?? [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    useDocumentStore.setState({
      documents: [
        {
          document_id: 'document-1',
          filename: 'Research.pdf',
          file_type: '.pdf',
          chunk_count: 1,
          total_chars: 10,
          file_size: 10,
          uploaded_at: new Date().toISOString(),
        },
      ],
    })
  })

  it('issues one membership PATCH for duplicate collection drops', async () => {
    render(<CollectionsPage />)
    const collection = await screen.findByRole('region', { name: 'Collection Research' })
    const dataTransfer = { getData: () => 'document-1' }

    fireEvent.drop(collection, { dataTransfer })
    fireEvent.drop(collection, { dataTransfer })

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1)
    })
    expect(updateMock).toHaveBeenCalledWith('collection-1', {
      document_ids: ['document-1'],
    })
  })
})
