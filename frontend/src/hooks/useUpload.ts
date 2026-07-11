import { useState } from 'react'
import { uploadDocument } from '../services/upload.service'
import { useDocumentStore } from '../store/document.store'
import type { DocumentSummary } from '../types/document'

export const useUpload = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentSummary | null>(null)
  const setDocumentStore = useDocumentStore((state) => state.setDocument)

  const upload = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const response = await uploadDocument(file)
      const documentSummary = {
        ...response.document,
        fileSize: file.size,
        fileType: file.type || 'Unknown',
        uploadedAt: new Date().toISOString(),
      }

      setDocument(documentSummary)
      setDocumentStore(documentSummary)
      return documentSummary
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { upload, loading, error, document }
}
