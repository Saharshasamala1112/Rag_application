import { useState } from 'react'
import { uploadDocument } from '../services/upload.service'
import type { DocumentSummary } from '../types/document'

export const useUpload = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentSummary | null>(null)

  const upload = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const response = await uploadDocument(file)
      setDocument(response.document)
      return response.document
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
