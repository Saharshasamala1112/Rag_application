import { useState } from 'react'
import { uploadDocument, listDocuments } from '../services/upload.service'
import { useDocumentStore } from '../store/document.store'
import type { DocumentInfo } from '../types/document'

export const useUpload = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDocument, setLastDocument] = useState<DocumentInfo | null>(null)
  const addDocument = useDocumentStore((state) => state.addDocument)
  const setDocuments = useDocumentStore((state) => state.setDocuments)

  const upload = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const response = await uploadDocument(file)
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin'
      const docInfo: DocumentInfo = {
        document_id: response.document_id,
        filename: response.filename,
        file_type: ext,
        chunk_count: response.chunk_count,
        total_chars: 0,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }

      setLastDocument(docInfo)
      addDocument(docInfo)
      return docInfo
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await listDocuments()
      setDocuments(response.documents)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }

  return { upload, loading, error, lastDocument, fetchDocuments }
}
