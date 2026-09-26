import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from '../store/document.store'

describe('DocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      activeDocumentId: null,
    })
  })

  it('sets documents', () => {
    const { setDocuments } = useDocumentStore.getState()
    const docs = [
      {
        document_id: '1',
        filename: 'a.pdf',
        file_type: '.pdf',
        chunk_count: 10,
        total_chars: 5000,
        file_size: 1024,
        uploaded_at: '',
      },
      {
        document_id: '2',
        filename: 'b.txt',
        file_type: '.txt',
        chunk_count: 5,
        total_chars: 2000,
        file_size: 512,
        uploaded_at: '',
      },
    ]
    setDocuments(docs)
    expect(useDocumentStore.getState().documents.length).toBe(2)
  })

  it('adds a document', () => {
    const { addDocument } = useDocumentStore.getState()
    addDocument({
      document_id: '1',
      filename: 'test.pdf',
      file_type: '.pdf',
      chunk_count: 0,
      total_chars: 0,
      file_size: 0,
      uploaded_at: '',
    })
    expect(useDocumentStore.getState().documents.length).toBe(1)
  })

  it('removes a document', () => {
    const { addDocument, removeDocument } = useDocumentStore.getState()
    addDocument({
      document_id: '1',
      filename: 'test.pdf',
      file_type: '.pdf',
      chunk_count: 0,
      total_chars: 0,
      file_size: 0,
      uploaded_at: '',
    })
    removeDocument('1')
    expect(useDocumentStore.getState().documents.length).toBe(0)
  })

  it('sets active document', () => {
    const { setActiveDocument } = useDocumentStore.getState()
    setActiveDocument('doc-123')
    expect(useDocumentStore.getState().activeDocumentId).toBe('doc-123')
  })

  it('clears active document when removed', () => {
    const { addDocument, setActiveDocument, removeDocument } = useDocumentStore.getState()
    addDocument({
      document_id: '1',
      filename: 'test.pdf',
      file_type: '.pdf',
      chunk_count: 0,
      total_chars: 0,
      file_size: 0,
      uploaded_at: '',
    })
    setActiveDocument('1')
    removeDocument('1')
    expect(useDocumentStore.getState().activeDocumentId).toBeNull()
  })
})
